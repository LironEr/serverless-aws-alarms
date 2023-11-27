import type { AlarmDefinition } from '../types';

export const DEFAULT_ALARM_DEFINITIONS: Record<string, AlarmDefinition> = {
  lambdaErrors: {
    enabled: false,
    namespace: 'AWS/Lambda',
    metric: 'Errors',
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    statistic: 'Sum',
    threshold: 1,
    period: 300,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
  },
  lambdaTimeout: {
    enabled: false,
    metricFilter: {
      pattern: 'Task timed out',
      metricValue: 1,
      defaultValue: 0,
    },
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    statistic: 'Sum',
    threshold: 1,
    period: 300,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    treatMissingData: 'notBreaching',
  },
};
