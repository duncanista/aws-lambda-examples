import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { BundlingOutput } from 'aws-cdk-lib';

const DOTNET_MEMORY_SIZE = 1769;

export class ExamplesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const _dotnetHelloWorld= new lambda.Function(this, "dotnet-hello-world", {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: "bootstrap",
      memorySize: DOTNET_MEMORY_SIZE,
      architecture: lambda.Architecture.ARM_64,
      code: get_asset_code("./dotnet/hello-world/"),
    });

    const _dotnetHelloWorldAOT = new lambda.Function(this, "dotnet-hello-world-aot", {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: "bootstrap",
      memorySize: DOTNET_MEMORY_SIZE,
      architecture: lambda.Architecture.ARM_64,
      code: get_asset_code("./dotnet/hello-world-aot/"),
    });

    const _dotnetHelloWorldR2R = new lambda.Function(this, "dotnet-hello-world-r2r", {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: "bootstrap",
      memorySize: DOTNET_MEMORY_SIZE,
      architecture: lambda.Architecture.ARM_64,
      code: get_asset_code("./dotnet/hello-world-r2r/"),
    });
  }
}

const get_asset_code = (path: string): lambda.AssetCode => {
  return lambda.Code.fromAsset(path, {
    bundling: {
      image: lambda.Runtime.DOTNET_8.bundlingImage,
      command: [
        "/bin/sh",
        "-c",
        " dotnet tool install -g Amazon.Lambda.Tools" +
          " && dotnet build" +
          " && dotnet lambda package --output-package /asset-output/function.zip",
      ],
      user: "root",
      outputType: BundlingOutput.ARCHIVED,
  }});
}