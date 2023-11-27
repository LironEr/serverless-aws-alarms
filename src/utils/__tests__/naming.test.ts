import { replacePlaceholders, getNamespaceForMetricFilter, getMetricNameForMetricFilter } from '../naming';

describe('naming utils', () => {
  describe('replacePlaceholders', () => {
    test('multiple placeholders', () => {
      expect(
        replacePlaceholders('Hello $[name], my name is $[name2]', {
          name: 'John',
          name2: 'Jane',
        }),
      ).toEqual('Hello John, my name is Jane');
    });

    test('unused placeholder', () => {
      expect(
        replacePlaceholders('Hello $[name]', {
          name: 'John',
          name2: 'Jane',
        }),
      ).toEqual('Hello John');
    });

    test('unknown placeholder', () => {
      expect(
        replacePlaceholders('Hello $[someName]', {
          name: 'John',
        }),
      ).toEqual('Hello $[someName]');
    });
  });

  describe('getNamespaceForMetricFilter', () => {
    test('with namespace', () => {
      expect(getNamespaceForMetricFilter('stackName', 'namespace')).toEqual('namespace');
    });

    test('without namespace', () => {
      expect(getNamespaceForMetricFilter('stackName')).toEqual(`CustomMetricFilter/stackName`);
    });

    test('empty namespace', () => {
      expect(getNamespaceForMetricFilter('stackName', '')).toEqual(`CustomMetricFilter/stackName`);
    });
  });

  describe('getMetricNameForMetricFilter', () => {
    test('with metric name', () => {
      expect(getMetricNameForMetricFilter('lambdaName', 'alarmDefinitionName', 'metricName')).toEqual(
        `lambdaNamemetricName`,
      );
    });

    test('without metric name', () => {
      expect(getMetricNameForMetricFilter('lambdaName', 'alarmDefinitionName')).toEqual(
        `lambdaNamealarmDefinitionName`,
      );
    });

    test('empty metric name', () => {
      expect(getMetricNameForMetricFilter('lambdaName', 'alarmDefinitionName', '')).toEqual(
        `lambdaNamealarmDefinitionName`,
      );
    });
  });
});
