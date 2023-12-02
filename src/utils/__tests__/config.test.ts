import { ZodError } from 'zod';
import { validateConfig } from '../config';
import { PluginConfig } from '../../types';
import { DEFAULT_NAME_TEMPLATE, DEFAULT_PREFIX_TEMPLATE, DEFAULT_SUFFIX_TEMPLATE } from '../../consts/naming';

describe('config utils', () => {
  describe('validateConfig', () => {
    test('bad config', () => {
      expect(() => validateConfig('string')).toThrow(ZodError);
    });

    test('undefined config', () => {
      expect(validateConfig(undefined)).toEqual({
        defaults: {
          enabled: true,
          prefixTemplate: DEFAULT_PREFIX_TEMPLATE,
          nameTemplate: DEFAULT_NAME_TEMPLATE,
          suffixTemplate: DEFAULT_SUFFIX_TEMPLATE,
        },
      });
    });

    test('empty object config', () => {
      expect(validateConfig({})).toEqual({
        defaults: {
          enabled: true,
          prefixTemplate: DEFAULT_PREFIX_TEMPLATE,
          nameTemplate: DEFAULT_NAME_TEMPLATE,
          suffixTemplate: DEFAULT_SUFFIX_TEMPLATE,
        },
      });
    });

    test('override some defaults', () => {
      const input: PluginConfig = {
        defaults: {
          suffixTemplate: 'critical',
          treatMissingData: 'notBreaching',
        },
      };
      expect(validateConfig(input)).toEqual({
        defaults: {
          enabled: true,
          prefixTemplate: DEFAULT_PREFIX_TEMPLATE,
          nameTemplate: DEFAULT_NAME_TEMPLATE,
          suffixTemplate: 'critical',
          treatMissingData: 'notBreaching',
        },
      });
    });
  });
});
