# Serverless AWS Alarms Plugin

[![serverless](http://public.serverless.com/badges/v3.svg)](https://www.serverless.com)
[![npm](https://img.shields.io/npm/v/serverless-aws-alarms)](https://www.npmjs.com/package/serverless-aws-alarms)
[![node](https://img.shields.io/node/v/serverless-aws-alarms)](https://github.com/LironEr/serverless-aws-alarms)
[![serverless](https://img.shields.io/npm/dependency-version/serverless-aws-alarms/peer/serverless.svg)](https://github.com/serverless/serverless)
[![license](https://img.shields.io/npm/l/serverless-aws-alarms)](https://www.npmjs.com/package/serverless-aws-alarms)

Serverless framework plugin that easily creates CloudWatch alarms for lambdas.

## Usage

```yml
service: service-name

plugins:
  - serverless-aws-alarms

custom:
  awsAlarms:
    stages: # optional - select which stages to deploy alarms to
      - staging
      - production

    actions:
      default: # optional - default actions for all alarms
        ok: arn:aws:sns:${self:provider.region}:${aws:accountId}:my-team-alerts-ok
        alarm: arn:aws:sns:${self:provider.region}:${aws:accountId}:my-team-alerts-alarm
        insufficientData: arn:aws:sns:${self:provider.region}:${aws:accountId}:my-team-alerts-insufficient-data
      critical: # optional - create more actions
        ok: !Ref MyTeamCriticalAlertsTopic # you can also use !Ref and other CloudFormation functions
        alarm: !ImportValue 'my-team-alerts'
    defaults:
      nameTemplate: $[functionName]-$[metricName]-alarm # Optional - naming template for alarms, can be overwritten in definitions
      prefixTemplate: $[stackName] # Optional - override the alarm name prefix

    definitions: # these defaults are merged with your definitions
      lambdaErrors:
        enabled: true
        period: 300 # override period
      lambdaTimeout:
        enabled: true
        period: 300 # override period
        threshold: 2000 # override threshold
        okActions:
          - critical
        alarmActions:
          - critical
        insufficientDataActions: [] # override insufficientDataActions to empty array (instead of using default)
      customAlarm: # create new alarm
        enabled: false
        prefixTemplate: $[stackName] # Optional - override the alarm name prefix
        nameTemplate: $[functionName]-high-duration-alarm # Optional - override the alarm name
        description: 'My custom alarm'
        namespace: 'AWS/Lambda'
        metric: Duration
        threshold: 200
        statistic: Average
        period: 300
        evaluationPeriods: 1
        datapointsToAlarm: 1
        comparisonOperator: GreaterThanOrEqualToThreshold

provider:
  name: aws
  runtime: nodejs18x

functions:
  foo:
    name: ${self:service}-foo
    handler: foo.handler
    alarms: # merged with definitions
      customAlarm:
        enabled: true
      someAlarm: # creates new alarm for this lambda or overwrite some properties of the alarm (with the same name) from definitions
        namespace: 'AWS/Lambda'
        metric: Errors
        threshold: 1
        statistic: Minimum
        period: 60
        evaluationPeriods: 1
        datapointsToAlarm: 1
        comparisonOperator: GreaterThanOrEqualToThreshold
        actionsEnabled: false
```

### Alarm defenition

Detailed description of the properties can be found in the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudwatch-alarm.html).

| name                    | description                                                                                            | type                                                       | default                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------- |
| enabled                 | Indicates whether the alarm will be created or not                                                     | `boolean`                                                  | `false`                           |
| prefixTemplate          | Prefix alarm name                                                                                      | `string`                                                   | `''`                              |
| nameTemplate            | The name of the alarm                                                                                  | `string`                                                   | `$[lambdaName]-$[definitionName]` |
| description             | The description of the alarm                                                                           | `string`                                                   |                                   |
| namespace               | The namespace of the metric associated with the alarm                                                  | `string`                                                   |                                   |
| metric                  | The name of the metric associated with the alarm                                                       | `string`                                                   |                                   |
| comparisonOperator      | The arithmetic operation to use when comparing the specified statistic and threshold                   | `string`                                                   |                                   |
| statistic               | The statistic for the metric associated with the alarm                                                 | `string`                                                   |                                   |
| threshold               | The value to compare with the specified statistic                                                      | `number`                                                   |                                   |
| period                  | The period, in seconds, over which the statistic is applied                                            | `number`                                                   |                                   |
| evaluationPeriods       | The number of periods over which data is compared to the specified threshold                           | `number`                                                   |                                   |
| datapointsToAlarm       | The number of datapoints that must be breaching to trigger the alarm                                   | `number`                                                   |                                   |
| actionsEnabled          | Indicates whether actions should be executed during any changes to the alarm state                     | `boolean`                                                  |                                   |
| okActions               | The actions to execute when this alarm transitions to the OK state from any other state                | `string[]`                                                 |                                   |
| alarmActions            | The list of actions to execute when this alarm transitions into an ALARM state from any other state    | `string[]`                                                 |                                   |
| insufficientDataActions | The actions to execute when this alarm transitions to the INSUFFICIENT_DATA state from any other state | `string[]`                                                 |                                   |
| treatMissingData        | Sets how this alarm is to handle missing data points                                                   | `string`                                                   |                                   |
| metricFilter            | Create an alarm based on a pattern found in a log group                                                | [`AlarmMetricFilterDefinition`](#metric-filter-definition) |                                   |

### Metric filter definition

Detailed description of the properties can be found in the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-logs-metricfilter.html).

| name         | description                                                                                                                                           | type                  | default                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------- |
| pattern      | A filter pattern for extracting metric data out of ingested log events. For more information, see [Filter and Pattern Syntax][FilterAndPatternSyntax] | `string` **required** |                                             |
| metricValue  | The value that is published to the CloudWatch metric                                                                                                  | `string` \| `number`  |                                             |
| defaultValue | The value to emit when a filter pattern does not match a log event                                                                                    | `number`              |                                             |
| nameTemplate | The name of the metric filter                                                                                                                         | `string`              | `$[lambdaName]$[definitionName]AlarmFilter` |

### Name template placeholders

You can use the following placeholders in the `nameTemplate` and `prefixTemplate` properties:

- `stackName` - the name of the stack
- `lambdaName` - the name of the lambda
- `lambdaId` - the name of the lambda resource (the key in `functions` section)
- `lambdaLogicalId` - the name of the lambda resource in the CloudFormation template
- `metricName` - the name of the metric (from alarm defenition)
- `definitionName` - the name of the alarm definition

Usage example:

```yml
nameTemplate: $[stackName]-$[lambdaName]-$[metricName]-alarm
prefixTemplate: $[stackName]
```

[FilterAndPatternSyntax]: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
