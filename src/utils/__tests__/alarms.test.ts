// @ts-ignore
import awsNaming from 'serverless/lib/plugins/aws/lib/naming';
import { generateRandomString } from '@tests/utils/utils';
import { getAlarmDefinitionsForLambda, generateMetricFilterCloudFormationResourcesForDefinition } from '../alarms';
import { AlarmDefinition } from '../../types';
import { DEFAULT_METRIC_FILTER_NAME_TEMPLATE } from '../../consts/naming';

describe('alarms utils', () => {
  describe('generateMetricFilterCloudFormationResourcesForDefinition', () => {
    const alarmDefinitionName = 'lambdaErrorLogs';
    const stackName = generateRandomString();
    const lambdaId = 'SomeFunc';
    const lambdaName = 'some-func';

    test('without metricFilter property', () => {
      const alarmDef: AlarmDefinition = {
        description: 'error logs exceed the threshold',
        metric: 'error-logs',
        threshold: 1,
        statistic: 'Sum',
        period: 300,
        evaluationPeriods: 1,
        comparisonOperator: 'GreaterThanOrEqualToThreshold',
        treatMissingData: 'notBreaching',
      };

      const resources = generateMetricFilterCloudFormationResourcesForDefinition(alarmDefinitionName, alarmDef, {
        stackName,
        lambdaId,
        awsNaming,
        lambdaName,
      });

      expect(resources).toEqual({});
    });

    test('create metric filter with only pattern', () => {
      const alarmDef: AlarmDefinition = {
        description: 'error logs exceed the threshold',
        metric: 'error-logs',
        threshold: 1,
        statistic: 'Sum',
        period: 300,
        evaluationPeriods: 1,
        comparisonOperator: 'GreaterThanOrEqualToThreshold',
        metricFilter: {
          pattern: 'ERROR',
          metricValue: 1,
          nameTemplate: DEFAULT_METRIC_FILTER_NAME_TEMPLATE,
        },
        treatMissingData: 'notBreaching',
      };

      const resources = generateMetricFilterCloudFormationResourcesForDefinition(alarmDefinitionName, alarmDef, {
        stackName,
        lambdaId,
        awsNaming,
        lambdaName,
      });

      expect(resources).toEqual({
        SomeFuncLambdaFunctionLambdaErrorLogsAlarmFilter: {
          Type: 'AWS::Logs::MetricFilter',
          Properties: {
            FilterName: `${lambdaName}${alarmDefinitionName}AlarmFilter`,
            FilterPattern: 'ERROR',
            LogGroupName: `/aws/lambda/${lambdaName}`,
            MetricTransformations: [
              {
                MetricNamespace: `CustomMetricFilter/${stackName}`,
                MetricName: `${lambdaName}error-logs`,
                MetricValue: '1',
              },
            ],
          },
          DependsOn: ['SomeFuncLogGroup'],
        },
      });
    });

    test('create metric filter string metric value', () => {
      const alarmDef: AlarmDefinition = {
        description: 'error logs exceed the threshold',
        metric: 'count-something',
        threshold: 1,
        statistic: 'Sum',
        period: 300,
        evaluationPeriods: 1,
        comparisonOperator: 'GreaterThanOrEqualToThreshold',
        metricFilter: {
          pattern: '{$.count = *}',
          metricValue: '$.count',
          nameTemplate: '$[lambdaName]CountSomething',
        },
        treatMissingData: 'notBreaching',
      };

      const resources = generateMetricFilterCloudFormationResourcesForDefinition(alarmDefinitionName, alarmDef, {
        stackName,
        lambdaId,
        awsNaming,
        lambdaName,
      });

      expect(resources).toEqual({
        SomeFuncLambdaFunctionLambdaErrorLogsAlarmFilter: {
          Type: 'AWS::Logs::MetricFilter',
          Properties: {
            FilterName: `${lambdaName}CountSomething`,
            FilterPattern: '{$.count = *}',
            LogGroupName: `/aws/lambda/${lambdaName}`,
            MetricTransformations: [
              {
                MetricNamespace: `CustomMetricFilter/${stackName}`,
                MetricName: `${lambdaName}count-something`,
                MetricValue: '$.count',
              },
            ],
          },
          DependsOn: ['SomeFuncLogGroup'],
        },
      });
    });
  });

  describe('getAlarmDefinitionsForLambda', () => {
    test('change property', () => {
      expect(
        getAlarmDefinitionsForLambda(
          {
            defaults: { nameTemplate: 'nameTemplate', prefixTemplate: 'prefixTemplate' },
            definitions: {
              lambdaErrors: {
                nameTemplate: 'nameTemplate2',
                namespace: 'namespace',
                metric: 'metric',
                comparisonOperator: 'comparisonOperator',
                statistic: 'statistic',
                threshold: 1,
                period: 1,
              },
              lambdaInvocations: {
                prefixTemplate: undefined,
                namespace: 'namespace',
                metric: 'invocations',
                comparisonOperator: 'comparisonOperator',
                statistic: 'statistic',
                threshold: 1,
                period: 1,
              },
            },
          },
          { lambdaErrors: { threshold: 2 } },
        ),
      ).toEqual({
        lambdaErrors: {
          nameTemplate: 'nameTemplate2',
          prefixTemplate: 'prefixTemplate',
          namespace: 'namespace',
          metric: 'metric',
          comparisonOperator: 'comparisonOperator',
          statistic: 'statistic',
          threshold: 2,
          period: 1,
        },
        lambdaInvocations: {
          nameTemplate: 'nameTemplate',
          prefixTemplate: undefined,
          namespace: 'namespace',
          metric: 'invocations',
          comparisonOperator: 'comparisonOperator',
          statistic: 'statistic',
          threshold: 1,
          period: 1,
        },
      });
    });

    test('no lambda alarms', () => {
      expect(
        getAlarmDefinitionsForLambda(
          {
            defaults: { nameTemplate: 'nameTemplate' },
            definitions: {
              lambdaErrors: {
                namespace: 'namespace',
                metric: 'metric',
                comparisonOperator: 'comparisonOperator',
                statistic: 'statistic',
                threshold: 1,
                period: 1,
              },
              lambdaInvocations: {
                namespace: 'namespace',
                metric: 'invocations',
                comparisonOperator: 'comparisonOperator',
                statistic: 'statistic',
                threshold: 1,
                period: 1,
              },
            },
          },
          undefined,
        ),
      ).toEqual({
        lambdaErrors: {
          nameTemplate: 'nameTemplate',
          namespace: 'namespace',
          metric: 'metric',
          comparisonOperator: 'comparisonOperator',
          statistic: 'statistic',
          threshold: 1,
          period: 1,
        },
        lambdaInvocations: {
          nameTemplate: 'nameTemplate',
          namespace: 'namespace',
          metric: 'invocations',
          comparisonOperator: 'comparisonOperator',
          statistic: 'statistic',
          threshold: 1,
          period: 1,
        },
      });
    });

    test('array overwrite', () => {
      expect(
        getAlarmDefinitionsForLambda(
          {
            defaults: { nameTemplate: 'nameTemplate', insufficientDataActions: ['insufficientDataActions'] },
            definitions: {
              lambdaErrors: {
                namespace: 'namespace',
                metric: 'metric',
                comparisonOperator: 'comparisonOperator',
                statistic: 'statistic',
                threshold: 1,
                period: 1,
                okActions: ['okActions'],
                alarmActions: ['alarmActions'],
              },
              lambdaInvocations: {
                namespace: 'namespace',
                metric: 'invocations',
                comparisonOperator: 'comparisonOperator',
                statistic: 'statistic',
                threshold: 1,
                period: 1,
                okActions: ['okActions'],
              },
            },
          },
          {
            lambdaErrors: {
              okActions: [],
              alarmActions: undefined,
            },
            lambdaInvocations: {
              okActions: ['okActions2'],
              alarmActions: ['alarmActions'],
              insufficientDataActions: ['insufficientDataActions2'],
            },
          },
        ),
      ).toEqual({
        lambdaErrors: {
          nameTemplate: 'nameTemplate',
          namespace: 'namespace',
          metric: 'metric',
          comparisonOperator: 'comparisonOperator',
          statistic: 'statistic',
          threshold: 1,
          period: 1,
          okActions: [],
          alarmActions: undefined,
          insufficientDataActions: ['insufficientDataActions'],
        },
        lambdaInvocations: {
          nameTemplate: 'nameTemplate',
          namespace: 'namespace',
          metric: 'invocations',
          comparisonOperator: 'comparisonOperator',
          statistic: 'statistic',
          threshold: 1,
          period: 1,
          okActions: ['okActions2'],
          alarmActions: ['alarmActions'],
          insufficientDataActions: ['insufficientDataActions2'],
        },
      });
    });

    test('new alarm definition', () => {
      expect(
        getAlarmDefinitionsForLambda(
          {
            defaults: { nameTemplate: 'nameTemplate' },
            definitions: {
              lambdaErrors: {
                namespace: 'namespace',
                metric: 'metric',
                comparisonOperator: 'comparisonOperator',
                statistic: 'statistic',
                threshold: 1,
                period: 1,
              },
              lambdaInvocations: {
                namespace: 'namespace',
                metric: 'invocations',
                comparisonOperator: 'comparisonOperator',
                statistic: 'statistic',
                threshold: 1,
                period: 1,
              },
            },
          },
          {
            lambdaErrors: {
              period: 300,
            },
            criticalLambdaErrors: {
              namespace: 'namespace',
              metric: 'metric',
              comparisonOperator: 'comparisonOperator',
              statistic: 'statistic',
              threshold: 5,
              period: 100,
            },
          },
        ),
      ).toEqual({
        lambdaErrors: {
          nameTemplate: 'nameTemplate',
          namespace: 'namespace',
          metric: 'metric',
          comparisonOperator: 'comparisonOperator',
          statistic: 'statistic',
          threshold: 1,
          period: 300,
        },
        lambdaInvocations: {
          nameTemplate: 'nameTemplate',
          namespace: 'namespace',
          metric: 'invocations',
          comparisonOperator: 'comparisonOperator',
          statistic: 'statistic',
          threshold: 1,
          period: 1,
        },
        criticalLambdaErrors: {
          nameTemplate: 'nameTemplate',
          namespace: 'namespace',
          metric: 'metric',
          comparisonOperator: 'comparisonOperator',
          statistic: 'statistic',
          threshold: 5,
          period: 100,
        },
      });
    });
  });
});
