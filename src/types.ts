import type Serverless from 'serverless';

// https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html
export interface AlarmMetricFilterDefinition {
  // https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntaxForMetricFilters.html
  pattern: string;
  metricValue?: number | string;
  defaultValue?: number;
  nameTemplate?: string;
}

export interface AlarmDefinition {
  enabled?: boolean;
  prefixTemplate?: string;
  nameTemplate?: string;
  suffixTemplate?: string;
  description?: string;
  namespace?: string;
  metric?: string;
  comparisonOperator?: string;
  statistic?: string;
  threshold?: number;
  period?: number;
  evaluationPeriods?: number;
  datapointsToAlarm?: number;
  actionsEnabled?: boolean;
  okActions?: string[];
  alarmActions?: string[];
  insufficientDataActions?: string[];
  treatMissingData?: string;
  metricFilter?: AlarmMetricFilterDefinition;
  tags?: Record<string, string | null>;
}

// Can be string (arn) or object (!Ref/!Sub...) or an array of those
export type AlarmAction = string | object | (string | object)[];

export interface AlarmActions {
  ok?: AlarmAction;
  alarm?: AlarmAction;
  insufficientData?: AlarmAction;
}

export interface PluginConfig {
  stages?: string[];
  defaults?: Partial<AlarmDefinition>;
  actions?: Record<string, AlarmActions>;
  definitions?: Record<string, AlarmDefinition>;
}

export type ServerlessLambdaDefinition = (Serverless.FunctionDefinitionHandler | Serverless.FunctionDefinitionImage) & {
  alarms?: unknown;
};

export type LambdaAlarms = Record<string, Partial<AlarmDefinition>>;

// https://github.com/serverless/serverless/blob/9d7b121bd1b1ff0f3adcc14bf3dfecf27d589c0f/lib/plugins/aws/lib/naming.js
export interface AwsNaming {
  getStackName(): string;
  getNormalizedResourceName(resourceName: string): string;
  getLambdaLogicalId(functionName: string): string;
  getLogGroupName(functionName: string): string;
  getLogGroupLogicalId(functionName: string): string;
  normalizeName(name: string): string;
}

export type CompiledAlarmAction = string | object;

export interface CompiledAlarmActions {
  ok: CompiledAlarmAction[];
  alarm: CompiledAlarmAction[];
  insufficientData: CompiledAlarmAction[];
}
