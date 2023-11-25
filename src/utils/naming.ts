import { DEFAULT_NAME_TEMPLATE, DEFAULT_METRIC_FILTER_NAME_TEMPLATE } from '../consts/naming';

type BasePlaceholders = 'stackName' | 'lambdaName' | 'lambdaId' | 'lambdaLogicalId' | 'metricName' | 'definitionName';

interface GetAlarmNameOptions {
  nameTemplate?: string;
  prefixTemplate?: string;
  placeholders: Record<BasePlaceholders, string>;
}

export function getAlarmName({ nameTemplate, prefixTemplate, placeholders }: GetAlarmNameOptions) {
  // nameTemplate shouldn't be undefined here, but anyway we have a default value just in case
  const alarmName = replacePlaceholders(nameTemplate || DEFAULT_NAME_TEMPLATE, placeholders);
  const prefix = prefixTemplate ? replacePlaceholders(prefixTemplate, placeholders) : undefined;

  return prefix ? `${prefix}-${alarmName}` : alarmName;
}

interface GetMetricFilterNameOptions {
  nameTemplate?: string;
  placeholders: Record<BasePlaceholders, string>;
}

export function getMetricFilterName({ nameTemplate, placeholders }: GetMetricFilterNameOptions) {
  // nameTemplate shouldn't be undefined here, but anyway we have a default value just in case
  return replacePlaceholders(nameTemplate || DEFAULT_METRIC_FILTER_NAME_TEMPLATE, placeholders);
}

export function replacePlaceholders(template: string, placeholders: Record<string, string>) {
  return Object.entries(placeholders).reduce((acc, [placeholder, value]) => {
    return acc.replace(`$[${placeholder}]`, value);
  }, template);
}

export function getNamespaceForMetricFilter(stackName: string, namespace?: string) {
  return namespace || `CustomMetricFilter/${stackName}`;
}

export function getMetricNameForMetricFilter(lambdaName: string, alarmDefinitionName: string, metricName?: string) {
  return `${lambdaName}${metricName || alarmDefinitionName}`;
}
