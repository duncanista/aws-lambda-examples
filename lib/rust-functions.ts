import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { RustFunction } from 'cargo-lambda-cdk';

const RUST_MEMORY_SIZE = 128;

export const getRustFunctions = (stack: cdk.Stack): lambda.Function[] => {
  const arm = new RustFunction(stack, 'hello-world-arm', {
    manifestPath: './rust/hello-world/Cargo.toml',
    memorySize: RUST_MEMORY_SIZE,
    architecture: lambda.Architecture.ARM_64,
  });

  const amd = new RustFunction(stack, 'hello-world-amd', {
    manifestPath: './rust/hello-world/Cargo.toml',
    memorySize: RUST_MEMORY_SIZE,
    architecture: lambda.Architecture.X86_64,
  });

  return [arm, amd];
}