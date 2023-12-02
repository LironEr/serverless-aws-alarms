import {
  replacePlaceholders,
  getAlarmName,
  getNamespaceForMetricFilter,
  getMetricNameForMetricFilter,
  GetAlarmNameOptions,
} from '../naming';

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

  describe('getAlarmName', () => {
    const placeholders: GetAlarmNameOptions['placeholders'] = {
      stackName: 'stackName',
      lambdaName: 'lambdaName',
      lambdaId: 'lambdaId',
      lambdaLogicalId: 'lambdaLogicalId',
      metricName: 'metricName',
      definitionName: 'definitionName',
    };

    test('only with nameTemplate', () => {
      expect(getAlarmName({ nameTemplate: '$[lambdaName]-$[definitionName]-alarm', placeholders })).toEqual(
        'lambdaName-definitionName-alarm',
      );
    });

    test('nameTemplate with prefix', () => {
      expect(
        getAlarmName({
          nameTemplate: '$[definitionName]-alarm',
          prefixTemplate: '$[lambdaName]',
          suffixTemplate: '',
          placeholders,
        }),
      ).toEqual('lambdaName-definitionName-alarm');
    });

    test('nameTemplate with suffix', () => {
      expect(
        getAlarmName({
          nameTemplate: '$[lambdaName]-$[definitionName]',
          suffixTemplate: '$[stackName]-warning',
          placeholders,
        }),
      ).toEqual('lambdaName-definitionName-stackName-warning');
    });

    test('nameTemplate with prefix and suffix', () => {
      expect(
        getAlarmName({
          nameTemplate: '$[lambdaName]-$[definitionName]',
          prefixTemplate: '$[stackName]',
          suffixTemplate: 'warning',
          placeholders,
        }),
      ).toEqual('stackName-lambdaName-definitionName-warning');
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
