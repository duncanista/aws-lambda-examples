import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

import { getDotnetFunctions } from './dotnet-functions';

export class ExamplesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.tags.setTag("DD_PRESERVE_STACK", "true");

    // Create EventBridge rule that runs every hour
    const rule = new events.Rule(this, 'HourlyRule', {
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      description: 'Rule to trigger Lambda function every hour',
    });

    // Create .NET Lambda Functions
    const dotnetFunctions = getDotnetFunctions(this); 

    // Add the Lambda function as a target for the rule
    dotnetFunctions.map(f => addTarget(rule, f));
  }
}

const addTarget = (rule: events.Rule, func: lambda.Function) => {
  rule.addTarget(new targets.LambdaFunction(func, {
    retryAttempts: 2,
  }));
}