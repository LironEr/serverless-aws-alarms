import { z } from 'zod';
import { AlarmMetricFilterDefinition, AlarmActions, AlarmDefinition, PluginConfig } from '../types';
import {
  DEFAULT_NAME_TEMPLATE,
  DEFAULT_PREFIX_TEMPLATE,
  DEFAULT_SUFFIX_TEMPLATE,
  DEFAULT_METRIC_FILTER_NAME_TEMPLATE,
} from '../consts/naming';

const alarmMetricFilterDefSchema = z.object({
  pattern: z.string(),
  metricValue: z.optional(z.union([z.number(), z.string()])).default(1),
  defaultValue: z.optional(z.number()),
  nameTemplate: z.string().default(DEFAULT_METRIC_FILTER_NAME_TEMPLATE),
}) satisfies z.ZodType<AlarmMetricFilterDefinition>;

const alarmDefSchema = z.object({
  enabled: z.boolean().default(true),
  prefixTemplate: z.optional(z.string()),
  nameTemplate: z.optional(z.string()),
  suffixTemplate: z.optional(z.string()),
  description: z.optional(z.string().max(1024)),
  namespace: z.optional(z.string()),
  metric: z.optional(z.string()),
  comparisonOperator: z.optional(
    z.enum([
      'GreaterThanOrEqualToThreshold',
      'GreaterThanThreshold',
      'GreaterThanUpperThreshold',
      'LessThanLowerOrGreaterThanUpperThreshold',
      'LessThanLowerThreshold',
      'LessThanOrEqualToThreshold',
      'LessThanThreshold',
    ]),
  ),
  statistic: z.optional(z.string()),
  threshold: z.optional(z.number()),
  period: z.optional(z.number()),
  evaluationPeriods: z.optional(z.number()),
  datapointsToAlarm: z.optional(z.number()),
  actionsEnabled: z.optional(z.boolean()),
  okActions: z.array(z.string()).optional(),
  alarmActions: z.array(z.string()).optional(),
  insufficientDataActions: z.array(z.string()).optional(),
  treatMissingData: z.optional(z.enum(['missing', 'ignore', 'breaching', 'notBreaching'])),
  metricFilter: z.optional(alarmMetricFilterDefSchema),
  tags: z.optional(z.record(z.string().min(1).max(128), z.string().min(1).max(256).nullable())),
}) satisfies z.ZodType<AlarmDefinition>;

const alarmActionSchema = z.union([
  z.string(),
  z.record(z.string(), z.any()),
  z.array(z.string(), z.record(z.string(), z.any())),
]);

const alarmActionsSchema = z.object({
  ok: z.optional(alarmActionSchema),
  alarm: z.optional(alarmActionSchema),
  insufficientData: z.optional(alarmActionSchema),
}) satisfies z.ZodType<AlarmActions>;

const defaultsDefsSchema = alarmDefSchema.extend({
  prefixTemplate: z.optional(z.string()).default(DEFAULT_PREFIX_TEMPLATE),
  nameTemplate: z.optional(z.string()).default(DEFAULT_NAME_TEMPLATE),
  suffixTemplate: z.optional(z.string()).default(DEFAULT_SUFFIX_TEMPLATE),
}) satisfies z.ZodType<PluginConfig['defaults']>;

const configSchema = z.object({
  stages: z.optional(z.array(z.string())),
  defaults: defaultsDefsSchema.default({}),
  definitions: z.optional(z.record(alarmDefSchema)),
  actions: z.optional(z.record(alarmActionsSchema)),
}) satisfies z.ZodType<PluginConfig>;

export function validateConfig(c: unknown): PluginConfig {
  return configSchema.parse(c ?? {}) as PluginConfig;
}

const lambdaAlarmsSchema = z.record(alarmDefSchema);

export function validateLambdaAlarmsConfig(c: unknown) {
  return lambdaAlarmsSchema.safeParse(c ?? {});
}
