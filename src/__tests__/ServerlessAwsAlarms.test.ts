import { MockLogging, MockServerless } from '@tests/utils/MockServerless';
import { PluginConfig } from '../types';
import { DEFAULT_NAME_TEMPLATE, DEFAULT_PREFIX_TEMPLATE } from '../consts/naming';
import { DEFAULT_ALARM_DEFINITIONS } from '../consts/definitions';
import { ServerlessAwsAlarms } from '../ServerlessAwsAlarms';
import { TEST_ACCOUNT_NUM } from '@tests/consts';

describe('ServerlessAwsAlarms', () => {
  describe('config', () => {
    test('bad config', () => {
      const serverless = new MockServerless();
      serverless.service.custom.awsAlarms = 'bad config';

      const plugin = new ServerlessAwsAlarms(serverless, { stage: null, region: null }, MockLogging);

      expect(() => plugin.hooks['package:initialize']()).toThrow();
    });

    test('without calling package:initialize', () => {
      const serverless = new MockServerless();
      serverless.service.custom.awsAlarms = {};

      const plugin = new ServerlessAwsAlarms(serverless, { stage: null, region: null }, MockLogging);

      expect(() => plugin.config).toThrow('Plugin config is not initialized');
    });

    test('undefined config', () => {
      const serverless = new MockServerless();
      serverless.service.custom.awsAlarms = undefined;

      const plugin = new ServerlessAwsAlarms(serverless, { stage: null, region: null }, MockLogging);

      plugin.hooks['package:initialize']();

      expect(plugin.config).toEqual({
        defaults: {
          enabled: true,
          prefixTemplate: DEFAULT_PREFIX_TEMPLATE,
          nameTemplate: DEFAULT_NAME_TEMPLATE,
        },
        definitions: DEFAULT_ALARM_DEFINITIONS,
      });
    });

    test('empty object config', () => {
      const serverless = new MockServerless();
      serverless.service.custom.awsAlarms = undefined;

      const plugin = new ServerlessAwsAlarms(serverless, { stage: null, region: null }, MockLogging);

      plugin.hooks['package:initialize']();

      expect(plugin.config).toEqual({
        defaults: {
          enabled: true,
          prefixTemplate: DEFAULT_PREFIX_TEMPLATE,
          nameTemplate: DEFAULT_NAME_TEMPLATE,
        },
        definitions: DEFAULT_ALARM_DEFINITIONS,
      });
    });

    test('override some defaults', () => {
      const serverless = new MockServerless();
      serverless.service.custom.awsAlarms = {
        defaults: {
          prefixTemplate: '',
        },
      } as PluginConfig;

      const plugin = new ServerlessAwsAlarms(serverless, { stage: null, region: null }, MockLogging);

      plugin.hooks['package:initialize']();

      expect(plugin.config).toEqual({
        defaults: {
          enabled: true,
          prefixTemplate: '',
          nameTemplate: DEFAULT_NAME_TEMPLATE,
        },
        definitions: DEFAULT_ALARM_DEFINITIONS,
      });
    });
  });

  describe('generate alarms', () => {
    test('skip stage', () => {
      const serverless = new MockServerless();
      serverless.service.custom.awsAlarms = {
        stages: ['prod'],
        definitions: {
          lambdaErrors: {
            enabled: true,
          },
        },
      } as PluginConfig;

      serverless.service.functions['SomeFunc'] = {
        name: 'some-func',
        handler: 'handlers.someFunc',
        events: [],
      };

      const plugin = new ServerlessAwsAlarms(serverless, { stage: null, region: null }, MockLogging);
      const generateAlarmsForLambdaSpy = jest.spyOn(plugin, 'generateAlarmsForLambda');

      plugin.hooks['package:initialize']();
      plugin.hooks['package:compileEvents']();

      expect(generateAlarmsForLambdaSpy).toHaveBeenCalledTimes(0);
      expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).toEqual({});
    });

    test('no functions', () => {
      const serverless = new MockServerless();
      serverless.service.custom.awsAlarms = {
        definitions: {
          lambdaErrors: {
            enabled: true,
          },
        },
      } as PluginConfig;

      const plugin = new ServerlessAwsAlarms(serverless, { stage: null, region: null }, MockLogging);

      plugin.hooks['package:initialize']();
      plugin.hooks['package:compileEvents']();

      expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).toEqual({});
    });

    test('one function without actions & same stage', () => {
      const serverless = new MockServerless();
      serverless.service.custom.awsAlarms = {
        stages: ['prod', 'local'],
        definitions: {
          lambdaErrors: {
            enabled: true,
          },
        },
      } as PluginConfig;

      serverless.service.functions['SomeFunc'] = {
        name: 'some-func',
        handler: 'handlers.someFunc',
        events: [],
      };

      const plugin = new ServerlessAwsAlarms(serverless, { stage: null, region: null }, MockLogging);
      const generateAlarmsForLambdaSpy = jest.spyOn(plugin, 'generateAlarmsForLambda');
      plugin.hooks['package:initialize']();
      plugin.hooks['package:compileEvents']();

      expect(generateAlarmsForLambdaSpy).toHaveBeenCalledTimes(1);
      expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).toEqual({
        SomeFuncLambdaFunctionLambdaErrorsAlarm: {
          Type: 'AWS::CloudWatch::Alarm',
          Properties: {
            AlarmName: 'some-func-lambdaErrors',
            Namespace: 'AWS/Lambda',
            MetricName: 'Errors',
            ComparisonOperator: 'GreaterThanOrEqualToThreshold',
            Statistic: 'Sum',
            Threshold: 1,
            Period: 300,
            EvaluationPeriods: 1,
            DatapointsToAlarm: 1,
            Dimensions: [
              {
                Name: 'FunctionName',
                Value: 'some-func',
              },
            ],
            OKActions: [],
            AlarmActions: [],
            InsufficientDataActions: [],
          },
          DependsOn: ['SomeFuncLambdaFunction'],
        },
      });
    });

    test('one function with actions', () => {
      const serverless = new MockServerless();
      serverless.service.custom.awsAlarms = {
        actions: {
          default: {
            ok: `arn:aws:sns:us-east-1:${TEST_ACCOUNT_NUM}:my-team-alerts-ok`,
            alarm: `arn:aws:sns:us-east-1:${TEST_ACCOUNT_NUM}:my-team-alerts-alarm`,
            insufficientData: `arn:aws:sns:us-east-1:${TEST_ACCOUNT_NUM}:my-team-alerts-insufficientData`,
          },
        },
        definitions: {
          lambdaErrors: {
            enabled: true,
          },
        },
      } as PluginConfig;

      serverless.service.functions['SomeFunc'] = {
        name: 'some-func',
        handler: 'handlers.someFunc',
        events: [],
      };

      const plugin = new ServerlessAwsAlarms(serverless, { stage: null, region: null }, MockLogging);
      plugin.hooks['package:initialize']();
      plugin.hooks['package:compileEvents']();

      expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).toEqual({
        SomeFuncLambdaFunctionLambdaErrorsAlarm: {
          Type: 'AWS::CloudWatch::Alarm',
          Properties: {
            AlarmName: 'some-func-lambdaErrors',
            Namespace: 'AWS/Lambda',
            MetricName: 'Errors',
            ComparisonOperator: 'GreaterThanOrEqualToThreshold',
            Statistic: 'Sum',
            Threshold: 1,
            Period: 300,
            EvaluationPeriods: 1,
            DatapointsToAlarm: 1,
            Dimensions: [
              {
                Name: 'FunctionName',
                Value: 'some-func',
              },
            ],
            OKActions: [`arn:aws:sns:us-east-1:${TEST_ACCOUNT_NUM}:my-team-alerts-ok`],
            AlarmActions: [`arn:aws:sns:us-east-1:${TEST_ACCOUNT_NUM}:my-team-alerts-alarm`],
            InsufficientDataActions: [`arn:aws:sns:us-east-1:${TEST_ACCOUNT_NUM}:my-team-alerts-insufficientData`],
          },
          DependsOn: ['SomeFuncLambdaFunction'],
        },
      });
    });

    test('function with metric filter alarm', () => {
      const serverless = new MockServerless();
      serverless.service.custom.awsAlarms = {
        actions: {
          default: {
            ok: `arn:aws:sns:us-east-1:${TEST_ACCOUNT_NUM}:my-team-alerts-ok`,
            alarm: `arn:aws:sns:us-east-1:${TEST_ACCOUNT_NUM}:my-team-alerts-alarm`,
            insufficientData: `arn:aws:sns:us-east-1:${TEST_ACCOUNT_NUM}:my-team-alerts-insufficientData`,
          },
        },
        definitions: {
          lambdaErrors: {
            enabled: true,
          },
          lambdaTimeout: {
            enabled: true,
          },
        },
      } as PluginConfig;

      serverless.service.functions['SomeFunc'] = {
        name: 'some-func',
        handler: 'handlers.someFunc',
        events: [],
      };

      const plugin = new ServerlessAwsAlarms(serverless, { stage: null, region: null }, MockLogging);
      plugin.hooks['package:initialize']();
      plugin.hooks['package:compileEvents']();

      expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).toEqual({
        SomeFuncLambdaFunctionLambdaErrorsAlarm: {
          Type: 'AWS::CloudWatch::Alarm',
          Properties: {
            AlarmName: 'some-func-lambdaErrors',
            Namespace: 'AWS/Lambda',
            MetricName: 'Errors',
            Dimensions: [{ Name: 'FunctionName', Value: 'some-func' }],
            ComparisonOperator: 'GreaterThanOrEqualToThreshold',
            Statistic: 'Sum',
            Threshold: 1,
            Period: 300,
            EvaluationPeriods: 1,
            DatapointsToAlarm: 1,
            OKActions: ['arn:aws:sns:us-east-1:000000000000:my-team-alerts-ok'],
            AlarmActions: ['arn:aws:sns:us-east-1:000000000000:my-team-alerts-alarm'],
            InsufficientDataActions: ['arn:aws:sns:us-east-1:000000000000:my-team-alerts-insufficientData'],
          },
          DependsOn: ['SomeFuncLambdaFunction'],
        },
        SomeFuncLambdaFunctionLambdaTimeoutAlarmFilter: {
          Type: 'AWS::Logs::MetricFilter',
          Properties: {
            FilterName: 'some-funclambdaTimeoutAlarmFilter',
            FilterPattern: 'Task timed out',
            LogGroupName: '/aws/lambda/some-func',
            MetricTransformations: [
              {
                MetricNamespace: 'CustomMetricFilter/test-local',
                MetricName: 'some-funclambdaTimeout',
                DefaultValue: 0,
                MetricValue: '1',
              },
            ],
          },
          DependsOn: ['SomeFuncLogGroup'],
        },
        SomeFuncLambdaFunctionLambdaTimeoutAlarm: {
          Type: 'AWS::CloudWatch::Alarm',
          Properties: {
            AlarmName: 'some-func-lambdaTimeout',
            Namespace: 'CustomMetricFilter/test-local',
            MetricName: 'some-funclambdaTimeout',
            Dimensions: [],
            ComparisonOperator: 'GreaterThanOrEqualToThreshold',
            Statistic: 'Sum',
            Threshold: 1,
            Period: 300,
            EvaluationPeriods: 1,
            DatapointsToAlarm: 1,
            OKActions: ['arn:aws:sns:us-east-1:000000000000:my-team-alerts-ok'],
            AlarmActions: ['arn:aws:sns:us-east-1:000000000000:my-team-alerts-alarm'],
            InsufficientDataActions: ['arn:aws:sns:us-east-1:000000000000:my-team-alerts-insufficientData'],
            TreatMissingData: 'notBreaching',
          },
          DependsOn: ['SomeFuncLambdaFunction'],
        },
      });
    });
  });
});
