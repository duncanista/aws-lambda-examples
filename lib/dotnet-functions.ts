import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

const DOTNET_MEMORY_SIZE = 1769;

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
      outputType: cdk.BundlingOutput.ARCHIVED,
  }});
}

export const getDotnetFunctions = (stack: cdk.Stack): lambda.Function[] => {
  const simpleArm = new lambda.Function(stack, "hello-world-arm64", {
    runtime: lambda.Runtime.PROVIDED_AL2023,
    handler: "bootstrap",
    memorySize: DOTNET_MEMORY_SIZE,
    architecture: lambda.Architecture.ARM_64,
    code: getAssetCode("./dotnet/hello-world/", "arm64"),
  });

  const aotArm = new lambda.Function(stack, "hello-world-aot-arm64", {
    runtime: lambda.Runtime.PROVIDED_AL2023,
    handler: "bootstrap",
    memorySize: DOTNET_MEMORY_SIZE,
    architecture: lambda.Architecture.ARM_64,
    code: getAssetCode("./dotnet/hello-world-aot/", "arm64"),
  });

  const r2rArm = new lambda.Function(stack, "hello-world-r2r-arm64", {
    runtime: lambda.Runtime.PROVIDED_AL2023,
    handler: "bootstrap",
    memorySize: DOTNET_MEMORY_SIZE,
    architecture: lambda.Architecture.ARM_64,
    code: getAssetCode("./dotnet/hello-world-r2r/", "arm64"),
  });

  const simpleAmd = new lambda.Function(stack, "hello-world-amd64", {
    runtime: lambda.Runtime.PROVIDED_AL2023,
    handler: "bootstrap",
    memorySize: DOTNET_MEMORY_SIZE,
    architecture: lambda.Architecture.X86_64,
    code: getAssetCode("./dotnet/hello-world/", "x86_64"),
  });

  const r2rAmd = new lambda.Function(stack, "hello-world-r2r-amd64", {
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

  return [simpleAmd, r2rAmd, simpleArm, r2rArm, aotArm];
}