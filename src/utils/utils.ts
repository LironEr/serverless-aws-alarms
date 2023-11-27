import deepmerge from 'deepmerge';

export const overwriteArrayMerge: deepmerge.Options['arrayMerge'] = (_destinationArray, sourceArray, _options) =>
  sourceArray;
