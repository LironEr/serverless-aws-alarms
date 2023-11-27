import {
  CloudWatchClient,
  DescribeAlarmsCommand,
  DescribeAlarmsCommandInput,
  MetricAlarm,
} from '@aws-sdk/client-cloudwatch';
import { AWS_ENDPOINT_URL, AWS_REGION } from '../../src/consts/aws';

const client = new CloudWatchClient({ endpoint: AWS_ENDPOINT_URL, region: AWS_REGION });

export async function describeAlarms(input: DescribeAlarmsCommandInput) {
  const data = await client.send(new DescribeAlarmsCommand(input));

  return data.MetricAlarms ?? [];
}

export function assertAlarm(alarms: MetricAlarm[], alarmName: string, expected: Partial<MetricAlarm>) {
  const alarm = alarms.find((a) => a.AlarmName === alarmName);

  if (!alarm) {
    throw new Error(`Alarm ${alarmName} not found`);
  }

  expect(alarm).toMatchObject(expected);
}
