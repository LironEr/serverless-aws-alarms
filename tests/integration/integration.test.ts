import path from 'node:path';
import { runCMD } from '@tests/utils/cmd';
import { describeAlarms, assertAlarm } from '@tests/utils/alarms';
import { generateRandomString } from '@tests/utils/utils';
import { TEST_ACCOUNT_NUM } from '@tests/consts';
import { AWS_REGION } from '../../src/consts/aws';

jest.setTimeout(120 * 1000);

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SERVERLESS_DIR = path.resolve(ROOT_DIR, 'tests', 'integration', 'serverless');

describe('integration tests', () => {
  test('empty', async () => {
    const serviceName = `empty-${generateRandomString(10)}`;

    await runCMD({
      command: 'npx serverless deploy --stage local --config empty.yml',
      cwd: SERVERLESS_DIR,
      env: {
        SERVICE_NAME: serviceName,
      },
      timeoutSeconds: 90,
    });

    const alarms = await describeAlarms({ AlarmNamePrefix: serviceName });

    expect(alarms.length).toEqual(0);
  });

  test('basic', async () => {
    const serviceName = `basic-${generateRandomString(10)}`;

    await runCMD({
      command: 'npx serverless deploy --stage local --config basic.yml',
      cwd: SERVERLESS_DIR,
      env: {
        SERVICE_NAME: serviceName,
      },
      timeoutSeconds: 90,
    });

    const alarms = await describeAlarms({ AlarmNamePrefix: serviceName });

    expect(alarms.length).toEqual(3);

    // verify actions
    for (const alarm of alarms) {
      expect(alarm.OKActions).toEqual([`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-alerts-ok`]);
      expect(alarm.AlarmActions).toEqual([`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-alerts-alarm`]);
      expect(alarm.InsufficientDataActions).toEqual([
        `arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-alerts-insufficientData`,
      ]);
    }

    // verify alarm props

    assertAlarm(alarms, `${serviceName}-some-func-lambdaErrors`, {
      Namespace: 'AWS/Lambda',
      MetricName: 'Errors',
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      Statistic: 'Sum',
      Threshold: 5,
      Period: 360,
      EvaluationPeriods: 3,
      DatapointsToAlarm: 2,
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: `${serviceName}-some-func`,
        },
      ],
    });

    assertAlarm(alarms, `${serviceName}-some-func2-lambdaErrors`, {
      Namespace: 'AWS/Lambda',
      MetricName: 'Errors',
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      Statistic: 'Sum',
      Threshold: 5,
      Period: 300,
      EvaluationPeriods: 1,
      DatapointsToAlarm: 1,
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: `${serviceName}-some-func2`,
        },
      ],
    });

    assertAlarm(alarms, `${serviceName}-some-func2-criticalLambdaErrors`, {
      Namespace: 'AWS/Lambda',
      MetricName: 'Errors',
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      Statistic: 'Sum',
      Threshold: 10,
      Period: 300,
      EvaluationPeriods: 1,
      DatapointsToAlarm: 1,
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: `${serviceName}-some-func2`,
        },
      ],
    });
  });

  test('actions Ref', async () => {
    const serviceName = `actionsRef-${generateRandomString(10)}`;

    await runCMD({
      command: 'npx serverless deploy --stage local --config actionsRef.yml',
      cwd: SERVERLESS_DIR,
      env: {
        SERVICE_NAME: serviceName,
      },
      timeoutSeconds: 90,
    });

    const alarms = await describeAlarms({ AlarmNamePrefix: serviceName });

    expect(alarms.length).toEqual(1);

    // verify actions
    for (const alarm of alarms) {
      expect(alarm.OKActions).toEqual([
        `arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:${serviceName}-my-team-alerts-ok`,
      ]);
      expect(alarm.AlarmActions).toEqual([`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-alerts-alarm`]);
      expect(alarm.InsufficientDataActions).toEqual([
        `arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-alerts-insufficientData`,
      ]);
    }
  });

  test('multi actions', async () => {
    const serviceName = `multiActions-${generateRandomString(10)}`;

    await runCMD({
      command: 'npx serverless deploy --stage local --config multiActions.yml',
      cwd: SERVERLESS_DIR,
      env: {
        SERVICE_NAME: serviceName,
      },
      timeoutSeconds: 90,
    });

    const alarms = await describeAlarms({ AlarmNamePrefix: serviceName });

    expect(alarms.length).toEqual(5);

    assertAlarm(alarms, `${serviceName}-some-func-lambdaErrors`, {
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
          Value: `${serviceName}-some-func`,
        },
      ],
      OKActions: [`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-alerts-ok`],
      AlarmActions: [
        `arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-alerts-alarm`,
        `arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-low-alerts-alarm`,
      ],
      InsufficientDataActions: [`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-alerts-insufficientData`],
    });

    assertAlarm(alarms, `${serviceName}-some-func-lambdaTimeout`, {
      Namespace: `CustomMetricFilter/${serviceName}-local`,
      MetricName: `${serviceName}-some-funclambdaTimeout`,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      Statistic: 'Sum',
      Threshold: 1,
      Period: 300,
      EvaluationPeriods: 1,
      DatapointsToAlarm: 1,
      OKActions: [`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-low-alerts-ok`],
      AlarmActions: [`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-low-alerts-alarm`],
      InsufficientDataActions: [],
    });

    assertAlarm(alarms, `${serviceName}-some-func-criticalLambdaErrors`, {
      Namespace: 'AWS/Lambda',
      MetricName: 'Errors',
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      Statistic: 'Sum',
      Threshold: 5,
      Period: 300,
      EvaluationPeriods: 1,
      DatapointsToAlarm: 1,
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: `${serviceName}-some-func`,
        },
      ],
      OKActions: [`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-critical-alerts-ok`],
      AlarmActions: [`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-critical-alerts-alarm`],
      InsufficientDataActions: [`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-alerts-insufficientData`],
    });

    assertAlarm(alarms, `${serviceName}-some-func2-lambdaErrors`, {
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
          Value: `${serviceName}-some-func2`,
        },
      ],
      OKActions: [`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-alerts-ok`],
      AlarmActions: [
        `arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-alerts-alarm`,
        `arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-low-alerts-alarm`,
      ],
      InsufficientDataActions: [`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-alerts-insufficientData`],
    });

    assertAlarm(alarms, `${serviceName}-some-func2-lambdaTimeout`, {
      Namespace: `CustomMetricFilter/${serviceName}-local`,
      MetricName: `${serviceName}-some-func2lambdaTimeout`,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      Statistic: 'Sum',
      Threshold: 1,
      Period: 300,
      EvaluationPeriods: 1,
      DatapointsToAlarm: 1,
      OKActions: [`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-low-alerts-ok`],
      AlarmActions: [`arn:aws:sns:${AWS_REGION}:${TEST_ACCOUNT_NUM}:my-team-low-alerts-alarm`],
      InsufficientDataActions: [],
    });

    // Cant verify metric filters because they are not supported in localstack community edition
  });
});
