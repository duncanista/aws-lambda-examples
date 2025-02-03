use lambda_http::{run, service_fn, tracing, Error};
mod http_handler;
use http_handler::handler;

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(handler)).await
}
