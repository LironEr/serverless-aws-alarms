import type Serverless from 'serverless';
import type Plugin from 'serverless/classes/Plugin';
import type AwsProvider from 'serverless/aws';
import type { AwsNaming, CompiledAlarmActions, PluginConfig, ServerlessLambdaDefinition } from './types';

import deepmerge from 'deepmerge';
import { generateCloudFormationResourcesForDefinition, getAlarmDefinitionsForLambda } from './utils/alarms';
import Service from 'serverless/classes/Service';
import { compileActions } from './utils/actions';
import { validateConfig, validateLambdaAlarmsConfig } from './utils/config';
import { DEFAULT_ALARM_DEFINITIONS } from './consts/definitions';
import { overwriteArrayMerge } from './utils/utils';

export class ServerlessAwsAlarms implements Plugin {
  serverless: Serverless;
  options: any;
  logging: Plugin.Logging;
  logger: Plugin.Logging['log'];
  hooks: Plugin.Hooks;
  awsProvider: AwsProvider;
  awsNaming: AwsNaming;
  _config: PluginConfig | undefined;

  get config() {
    if (!this._config) {
      throw new Error('Plugin config is not initialized');
    }

    return this._config;
  }

  constructor(serverless: Serverless, options: Serverless.Options, logging: Plugin.Logging) {
    this.serverless = serverless;
    this.options = options;
    this.logging = logging;
    this.logger = logging.log;

    this.hooks = {
      'package:initialize': this.init.bind(this),
      'package:compileEvents': this.addAlarmResources.bind(this),
    };

    this.awsProvider = this.serverless.getProvider('aws');
    this.awsNaming = this.awsProvider.naming as any;

    serverless.configSchemaHandler.defineFunctionProperties('aws', {
      properties: {
        alarms: {
          type: 'object',
        },
      },
    });
  }

  init = () => {
    this._config = validateConfig(this.serverless.service.custom?.awsAlarms);

    this._config.definitions = deepmerge(DEFAULT_ALARM_DEFINITIONS, this._config.definitions || {}, {
      arrayMerge: overwriteArrayMerge,
    });
  };

  generateAlarmsForLambda = (
    service: Service,
    lambdaId: string,
    stackName: string,
    compiledActions: Record<string, CompiledAlarmActions>,
  ) => {
    const resourcesToAdd: Record<string, any> = {};

    const lambda = service.getFunction(lambdaId) as ServerlessLambdaDefinition;
    const lambdaName = lambda.name;

    if (!lambdaName) {
      throw new Error(`Lambda ${lambdaId} does not have a name`);
    }

    const lambdaAlarmsValidateResult = validateLambdaAlarmsConfig(lambda.alarms);

    if (!lambdaAlarmsValidateResult.success) {
      throw new Error(
        `Invalid alarms configuration for lambda ${lambdaId}: ${JSON.stringify(
          lambdaAlarmsValidateResult.error.issues,
          null,
          2,
        )}`,
      );
    }

    const alarmDefinitions = getAlarmDefinitionsForLambda(this.config, lambdaAlarmsValidateResult.data);

    Object.entries(alarmDefinitions).forEach(([alarmDefinitionName, defenition]) => {
      Object.assign(
        resourcesToAdd,
        generateCloudFormationResourcesForDefinition(alarmDefinitionName, defenition, {
          stackName,
          lambdaId,
          awsNaming: this.awsNaming,
          lambdaName,
          compiledActions,
        }),
      );
    });

    return resourcesToAdd;
  };

  addCfResources = (resources: Record<string, any>) => {
    const service = this.serverless.service;

    service.provider.compiledCloudFormationTemplate.Resources = {
      ...service.provider.compiledCloudFormationTemplate.Resources,
      ...resources,
    };
  };

  addAlarmResources = () => {
    const service = this.serverless.service;

    if (this.config.stages && !this.config.stages.includes(service.provider.stage)) {
      this.logger.info(`Skipping plugin for stage ${service.provider.stage}`);
      return;
    }

    this.logger.debug('Adding alarms to resources');

    const stackName = this.awsNaming.getStackName();
    const compiledActions = compileActions(this.config.actions || {});

    const resourcesToAdd: Record<string, any> = service.getAllFunctions().reduce((acc, lambdaId) => {
      return { ...acc, ...this.generateAlarmsForLambda(service, lambdaId, stackName, compiledActions) };
    }, {});

    this.logger.debug(`Adding ${Object.keys(resourcesToAdd).length} resources`);
    this.addCfResources(resourcesToAdd);
  };
}
