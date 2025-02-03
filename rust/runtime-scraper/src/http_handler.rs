use std::fs::{self, File};

use lambda_http::{Body, Error, Request, Response};
use prettytable::{Row, Table};
use reqwest::{header::HeaderMap, Client};
use scraper::{Html, Selector};
use similar::{ChangeTag, TextDiff};

const AWS_LAMBDA_RUNTIMES_URL: &str =
    "https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html";

// Table path, and index in HTML document
const TABLE_DATA: [(&str, usize); 2] = [
    ("supported_runtimes.csv", 0),
    ("deprecated_runtimes.csv", 2),
];

const TMP_PATH: &str = "/tmp/tmp.csv";

const OK_MESSAGE: &str = "NO CHANGES";
const WARNING_MESSAGE: &str = "CHANGES DETECTED";

pub(crate) async fn handler(_event: Request) -> Result<Response<Body>, Error> {
    let client = get_client();
    let tables = scrape(client).await?;

    let mut message = OK_MESSAGE;
    for (path, current_table, new_table) in tables {
        if diff_tables(current_table, new_table) {
            message = WARNING_MESSAGE;
            println!("Changes detected in {}", path);
        }
    }

    let resp = Response::builder()
        .status(200)
        .header("content-type", "text/html")
        .body(message.into())
        .map_err(Box::new)?;
    Ok(resp)
}

fn get_client() -> Client {
    let mut headers = HeaderMap::new();
    headers.insert(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 6.3; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0"
            .parse()
            .unwrap(),
    );
    headers.insert("Accept-Language", "en-US,en;q=0.5".parse().unwrap());

    Client::builder().default_headers(headers).build().unwrap()
}

async fn scrape(client: Client) -> Result<Vec<(String, Table, Table)>, Error> {
    let response = client.get(AWS_LAMBDA_RUNTIMES_URL).send().await?;

    let body = response.text().await?;
    let document = Html::parse_document(&body);

    // Select the table element
    let table_selector = Selector::parse("table").unwrap();
    let tr_selector = Selector::parse("tr").unwrap();
    let thead_tr_selector = Selector::parse("thead > tr").unwrap();
    let tbody_selector = Selector::parse("tbody").unwrap();

    let mut tables: Vec<(String, Table, Table)> = vec![];

    for data in TABLE_DATA.iter() {
        let (path, index) = data;

        let mut tmp_table = Table::new();

        let table_ref = document.select(&table_selector).nth(*index).unwrap();
        let thead_tr_ref = table_ref.select(&thead_tr_selector).next().unwrap();

        let headers_row = thead_tr_ref
            .text()
            .map(|t| t.trim())
            .filter(|t| !t.is_empty())
            .collect::<Vec<_>>();

        // Not using `set_titles` because when reading and getting the string,
        // the output will be different because of the separator.
        tmp_table.add_row(Row::from(&headers_row));

        let tbody_ref = table_ref.select(&tbody_selector).next().unwrap();
        let tr_elements = tbody_ref.select(&tr_selector);

        tr_elements.for_each(|e| {
            let row = e
                .text()
                .map(|t| t.trim())
                .filter(|t| !t.is_empty())
                .collect::<Vec<_>>();

            tmp_table.add_row(Row::from(&row));
        });

        let tmp_file = File::create(TMP_PATH)?;
        tmp_table.to_csv(tmp_file)?;

        let table = Table::from_csv_file(path)?;

        tables.push((path.to_string(), table, tmp_table));
    }
    fs::remove_file(TMP_PATH)?;

    Ok(tables)
}

fn diff_tables(current_table: Table, new_table: Table) -> bool {
    let c_str = current_table.to_string();
    let n_str = new_table.to_string();
    if c_str == n_str {
        return false;
    }

    println!("Tables are different");
    let diff = TextDiff::from_lines(&c_str, &n_str);
    for change in diff.iter_all_changes() {
        let sign = match change.tag() {
            ChangeTag::Delete => "-",
            ChangeTag::Insert => "+",
            ChangeTag::Equal => " ",
        };
        print!("{}{}", sign, change);
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use lambda_http::{Request, RequestExt};
    use std::collections::HashMap;

    #[tokio::test]
    async fn test_generic_http_handler() {
        let request = Request::default();

        let response = handler(request).await.unwrap();
        assert_eq!(response.status(), 200);

        let body_bytes = response.body().to_vec();
        let body_string = String::from_utf8(body_bytes).unwrap();

        assert_eq!(body_string, "hello world");
    }

    #[tokio::test]
    async fn test_http_handler_with_query_string() {
        let mut query_string_parameters: HashMap<String, String> = HashMap::new();
        query_string_parameters.insert("name".into(), "runtime-scraper".into());

        let request = Request::default().with_query_string_parameters(query_string_parameters);

        let response = handler(request).await.unwrap();
        assert_eq!(response.status(), 200);

        let body_bytes = response.body().to_vec();
        let body_string = String::from_utf8(body_bytes).unwrap();

        assert_eq!(body_string, "hello world");
    }
}
