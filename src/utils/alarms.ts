import type {
  AlarmDefinition,
  AwsNaming,
  CompiledAlarmActions,
  PluginConfig,
  ServerlessLambdaDefinition,
} from '../types';
import deepmerge from 'deepmerge';
import { getAlarmName, getMetricNameForMetricFilter, getNamespaceForMetricFilter, getMetricFilterName } from './naming';
import { overwriteArrayMerge } from './utils';
import { setCFAlarmAction } from './actions';

interface ServerlessLambdaInfo {
  awsNaming: AwsNaming;
  stackName: string;
  lambdaId: string;
  lambdaName: string;
  compiledActions: Record<string, CompiledAlarmActions>;
}

export function generateCloudFormationResourcesForDefinition(
  alarmDefinitionName: string,
  alarm: AlarmDefinition,
  { stackName, lambdaId, awsNaming, lambdaName, compiledActions }: ServerlessLambdaInfo,
) {
  if (alarm.enabled === false) {
    return {};
  }

  const lambdaLogicalId = awsNaming.getLambdaLogicalId(lambdaId);

  const resources: Record<string, any> = {};
  const alarmDimentions = [];

  if (alarm.metricFilter) {
    Object.assign(
      resources,
      generateMetricFilterCloudFormationResourcesForDefinition(alarmDefinitionName, alarm, {
        stackName,
        lambdaId,
        awsNaming,
        lambdaName,
      }),
    );
  } else {
    alarmDimentions.push({
      Name: 'FunctionName',
      Value: lambdaName,
    });
  }

  const cfAlarmProperties: any = {
    AlarmName: getAlarmName({
      nameTemplate: alarm.nameTemplate,
      prefixTemplate: alarm.prefixTemplate,
      suffixTemplate: alarm.suffixTemplate,
      placeholders: {
        definitionName: alarmDefinitionName,
        lambdaId,
        lambdaLogicalId,
        lambdaName,
        metricName: alarm.metric || alarmDefinitionName,
        stackName,
      },
    }),
    AlarmDescription: alarm.description,
    Namespace: alarm.metricFilter ? getNamespaceForMetricFilter(stackName, alarm.namespace) : alarm.namespace,
    MetricName: alarm.metricFilter
      ? getMetricNameForMetricFilter(lambdaName, alarmDefinitionName, alarm.metric)
      : alarm.metric,
    Dimensions: alarmDimentions,
    ComparisonOperator: alarm.comparisonOperator,
    Statistic: alarm.statistic,
    Threshold: alarm.threshold,
    Period: alarm.period,
    EvaluationPeriods: alarm.evaluationPeriods,
    DatapointsToAlarm: alarm.datapointsToAlarm,
    ActionsEnabled: alarm.actionsEnabled,
    OKActions: setCFAlarmAction({
      alarmActions: alarm.okActions,
      compiledActions,
      actionPropertyName: 'ok',
    }),
    AlarmActions: setCFAlarmAction({
      alarmActions: alarm.alarmActions,
      compiledActions,
      actionPropertyName: 'alarm',
    }),
    InsufficientDataActions: setCFAlarmAction({
      alarmActions: alarm.insufficientDataActions,
      compiledActions,
      actionPropertyName: 'insufficientData',
    }),
    TreatMissingData: alarm.treatMissingData,
  };

  if (alarm.tags && Object.keys(alarm.tags).length > 0) {
    cfAlarmProperties.Tags = Object.entries(alarm.tags)
      .map(([key, value]) => ({
        Key: key,
        Value: value,
      }))
      .filter((tag) => !!tag.Value);
  }

  resources[
    awsNaming.getNormalizedResourceName(`${lambdaLogicalId}${awsNaming.normalizeName(alarmDefinitionName)}Alarm`)
  ] = {
    Type: 'AWS::CloudWatch::Alarm',
    Properties: cfAlarmProperties,
    DependsOn: [lambdaLogicalId],
  };

  return resources;
}

export function generateMetricFilterCloudFormationResourcesForDefinition(
  alarmDefinitionName: string,
  alarmDef: AlarmDefinition,
  { stackName, lambdaId, awsNaming, lambdaName }: Omit<ServerlessLambdaInfo, 'compiledActions'>,
) {
  const metricFilterDef = alarmDef.metricFilter;

  if (!metricFilterDef) {
    return {};
  }

  const lambdaLogicalId = awsNaming.getLambdaLogicalId(lambdaId);
  const lambdaLogGroupName = awsNaming.getLogGroupName(lambdaName);
  const logGroupCfName = awsNaming.getLogGroupLogicalId(lambdaId);
  const namespace = getNamespaceForMetricFilter(stackName, alarmDef.namespace);
  const metricName = getMetricNameForMetricFilter(lambdaName, alarmDefinitionName, alarmDef.metric);

  return {
    [awsNaming.getNormalizedResourceName(
      `${lambdaLogicalId}${awsNaming.normalizeName(alarmDefinitionName)}AlarmFilter`,
    )]: {
      Type: 'AWS::Logs::MetricFilter',
      Properties: {
        FilterName: getMetricFilterName({
          nameTemplate: metricFilterDef.nameTemplate,
          placeholders: {
            definitionName: alarmDefinitionName,
            lambdaId,
            lambdaLogicalId,
            lambdaName,
            metricName: alarmDef.metric || alarmDefinitionName,
            stackName,
          },
        }),
        FilterPattern: metricFilterDef.pattern,
        LogGroupName: lambdaLogGroupName,
        MetricTransformations: [
          {
            MetricNamespace: namespace,
            MetricName: metricName,
            DefaultValue: metricFilterDef.defaultValue,
            MetricValue: String(metricFilterDef.metricValue),
          },
        ],
      },
      DependsOn: [logGroupCfName],
    },
  };
}

export function getAlarmDefinitionsForLambda(
  config: PluginConfig,
  lambdaAlarms: ServerlessLambdaDefinition['alarms'],
): Record<string, AlarmDefinition> {
  const definitions = deepmerge(config.definitions || {}, lambdaAlarms || {}, { arrayMerge: overwriteArrayMerge });

  // Apply defaults per definition
  Object.entries(definitions).forEach(([defName, definition]) => {
    definitions[defName] = deepmerge(config.defaults ?? {}, definition, { arrayMerge: overwriteArrayMerge });
  });

  return definitions;
}
