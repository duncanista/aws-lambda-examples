import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { BundlingOutput } from 'aws-cdk-lib';

const DOTNET_MEMORY_SIZE = 1769;

export class ExamplesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.tags.setTag("DD_PRESERVE_STACK", "true");

    // Create EventBridge rule that runs every hour
    const rule = new events.Rule(this, 'HourlyRule', {
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      description: 'Rule to trigger Lambda function every hour',
    });

    const simpleArm = new lambda.Function(this, "hello-world-arm64", {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: "bootstrap",
      memorySize: DOTNET_MEMORY_SIZE,
      architecture: lambda.Architecture.ARM_64,
      code: getAssetCode("./dotnet/hello-world/", "arm64"),
    });

    const aotArm = new lambda.Function(this, "hello-world-aot-arm64", {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: "bootstrap",
      memorySize: DOTNET_MEMORY_SIZE,
      architecture: lambda.Architecture.ARM_64,
      code: getAssetCode("./dotnet/hello-world-aot/", "arm64"),
    });

    const r2rArm = new lambda.Function(this, "hello-world-r2r-arm64", {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: "bootstrap",
      memorySize: DOTNET_MEMORY_SIZE,
      architecture: lambda.Architecture.ARM_64,
      code: getAssetCode("./dotnet/hello-world-r2r/", "arm64"),
    });

    const simpleAmd = new lambda.Function(this, "hello-world-amd64", {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: "bootstrap",
      memorySize: DOTNET_MEMORY_SIZE,
      architecture: lambda.Architecture.X86_64,
      code: getAssetCode("./dotnet/hello-world/", "x86_64"),
    });

    const r2rAmd = new lambda.Function(this, "hello-world-r2r-amd64", {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: "bootstrap",
      memorySize: DOTNET_MEMORY_SIZE,
      architecture: lambda.Architecture.X86_64,
      code: getAssetCode("./dotnet/hello-world-r2r/", "x86_64"),
    });

    // Can't do cross compilation on the same machine
    //
    // const aotAmd = new lambda.Function(this, "hello-world-aot-amd64", {
    //   runtime: lambda.Runtime.PROVIDED_AL2023,
    //   handler: "bootstrap",
    //   memorySize: DOTNET_MEMORY_SIZE,
    //   architecture: lambda.Architecture.X86_64,
    //   code: getAssetCode("./dotnet/hello-world-aot/", "x86_64"),
    // });

    const arr = [simpleAmd, r2rAmd, simpleArm, r2rArm, aotArm];

    // Add the Lambda function as a target for the rule
    arr.map(f => addTarget(rule, f));
  }
}

const addTarget = (rule: events.Rule, func: lambda.Function) => {
  rule.addTarget(new targets.LambdaFunction(func, {
    retryAttempts: 2,
  }));
}

const getAssetCode = (path: string, architecture: string): lambda.AssetCode => {
  const runtime = architecture === "x86_64" ? "x64" : architecture;
  return lambda.Code.fromAsset(path, {
    bundling: {
      image: lambda.Runtime.DOTNET_8.bundlingImage,
      command: [
        "/bin/sh",
        "-c",
        " dotnet tool install -g Amazon.Lambda.Tools" +
          ` && dotnet build -r linux-${runtime}` +
          ` && dotnet lambda package --output-package /asset-output/${architecture}.zip` +
          ` --function-architecture ${architecture}`
      ],
      user: "root",
      outputType: BundlingOutput.ARCHIVED,
  }});
}