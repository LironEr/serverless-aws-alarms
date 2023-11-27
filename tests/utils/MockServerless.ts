import type Serverless from 'serverless';
import type AwsProvider from 'serverless/aws';
import type Plugin from 'serverless/classes/Plugin';

// @ts-ignore
import awsNaming from 'serverless/lib/plugins/aws/lib/naming';

interface MockServerlessOptions {
  serviceName?: string;
  stage?: string;
  region?: string;
}

export class MockServerless implements Serverless {
  cli: Serverless['cli'];
  providers: Serverless['providers'];
  utils: Serverless['utils'];
  variables: Serverless['variables'];
  yamlParser: Serverless['yamlParser'];
  pluginManager: Serverless['pluginManager'];
  config: Serverless['config'];
  configurationFilename: Serverless['configurationFilename'];
  serverlessDirPath: Serverless['serverlessDirPath'];
  serviceDir: Serverless['serviceDir'];
  service: Serverless['service'];
  version: Serverless['version'];
  resources: Serverless['resources'];
  configSchemaHandler: Serverless['configSchemaHandler'];

  constructor({ serviceName, stage, region }: MockServerlessOptions = {}) {
    this.cli = {} as any;
    this.providers = {} as any;
    this.utils = {} as any;
    this.variables = {} as any;
    this.yamlParser = {} as any;
    this.pluginManager = {} as any;
    this.config = {} as any;
    this.configurationFilename = '';
    this.serverlessDirPath = '';
    this.serviceDir = '';
    this.service = new MockService(this, { serviceName: serviceName || 'test' });
    this.version = '0.0.0';
    this.resources = {} as any;
    this.configSchemaHandler = {
      defineCustomProperties: () => {},
      defineFunctionEvent: () => {},
      defineFunctionEventProperties: () => {},
      defineFunctionProperties: () => {},
      defineProvider: () => {},
      defineTopLevelProperty: () => {},
    };

    this.service.provider.stage = stage || 'local';
    this.service.provider.region = region || 'us-east-1';
  }

  init(): Promise<any> {
    throw new Error('Method not implemented.');
  }
  run(): Promise<any> {
    throw new Error('Method not implemented.');
  }
  setProvider(_name: string, _provider: any): null {
    throw new Error('Method not implemented.');
  }
  getProvider(_name: string): any {
    return this.service.provider;
  }
  getVersion(): string {
    throw new Error('Method not implemented.');
  }
}

interface MockServiceOptions {
  serviceName: string;
}

// implements serverless/classes/Service
class MockService {
  custom: Record<string, any>;
  provider: MockAwsProvier;
  serverless: MockServerless;
  service: string;
  functions: { [key: string]: Serverless.FunctionDefinitionHandler | Serverless.FunctionDefinitionImage };

  plugins: string[] = [];
  pluginsData: { [key: string]: any } = {};
  resources:
    | {
        Resources: {
          [key: string]: any;
        };
      }
    | { [key: string]: any } = {};
  package: { [key: string]: any } = {};
  configValidationMode: string = '';
  disabledDeprecations?: any[] | undefined;
  serviceFilename?: string | undefined;
  app?: any;
  tenant?: any;
  org?: any;
  layers: { [key: string]: any } = {};
  outputs?: any;
  initialServerlessConfig: any;

  constructor(serverless: MockServerless, { serviceName }: MockServiceOptions) {
    this.serverless = serverless;
    this.provider = new MockAwsProvier(serverless);
    this.custom = {};
    this.service = serviceName;
    this.functions = {};
  }

  load(_rawOptions: object): Promise<any> {
    return new Promise(() => {});
  }
  setFunctionNames(_rawOptions: object): void {}

  getServiceName() {
    return this.service;
  }
  getAllFunctions() {
    return Object.keys(this.functions);
  }

  getAllFunctionsNames(): string[] {
    return this.getAllFunctions().map((func) => this.getFunction(func).name!);
  }
  getFunction(functionName: string): Serverless.FunctionDefinitionHandler | Serverless.FunctionDefinitionImage {
    return this.functions[functionName];
  }
  getEventInFunction(_eventName: string, _functionName: string): Serverless.Event {
    return {} as any;
  }
  getAllEventsInFunction(_functionName: string): Serverless.Event[] {
    return [];
  }

  mergeResourceArrays(): void {}
  validate(): MockService {
    return this;
  }

  update(_data: object): object {
    return {};
  }
}

// https://github.com/serverless/serverless/blob/9d7b121bd1b1ff0f3adcc14bf3dfecf27d589c0f/lib/plugins/aws/provider.js
class MockAwsProvier implements AwsProvider {
  // copied from serverless/classes/Service
  compiledCloudFormationTemplate: {
    Resources: {
      [key: string]: any;
    };
    Outputs?:
      | {
          [key: string]: any;
        }
      | undefined;
  };

  name: string;
  stackTags?: { [key: string]: any };
  stage: string;
  region: string;
  runtime?: string | undefined;
  timeout?: number | undefined;
  versionFunctions: boolean = false;
  layers?: Array<string | Record<string, string>> | undefined;

  serverless: MockServerless;
  naming: any;
  iam?: AwsProvider.IamSettings | undefined;

  constructor(serverless: MockServerless) {
    this.serverless = serverless;
    this.name = 'aws';
    this.naming = { provider: this, ...awsNaming };
    this.compiledCloudFormationTemplate = {
      Resources: {},
    };
    this.stage = '';
    this.region = '';
  }

  getCredentials(): AwsProvider.Credentials {
    throw new Error('Method not implemented.');
  }
  getProviderName(): string {
    return 'aws';
  }
  getRegion(): string {
    return this.region;
  }
  getServerlessDeploymentBucketName(): Promise<string> {
    return new Promise((resolve) => {
      resolve(`serverless-deployment-${this.serverless.service}-${this.getStage()}-${this.getRegion()}`);
    });
  }
  getStage(): string {
    return this.stage;
  }
  getAccountId(): Promise<string> {
    throw new Error('Method not implemented.');
  }
  request(
    _service: string,
    _method: string,
    _params?: Record<string, any> | undefined,
    _options?: { useCache?: boolean | undefined; region?: string | undefined } | undefined,
  ): Promise<any> {
    throw new Error('Method not implemented.');
  }
}

export const MockLogging: Plugin.Logging = {
  log: {
    error: (...args: any[]) => console.log(...args),
    warning: (...args: any[]) => console.log(...args),
    notice: (...args: any[]) => console.log(...args),
    info: (...args: any[]) => console.log(...args),
    debug: (...args: any[]) => console.log(...args),
    verbose: (...args: any[]) => console.log(...args),
    success: (...args: any[]) => console.log(...args),
  },
  writeText: (_text: string | string[]) => {},
  progress: {
    get: (_name: string): Plugin.Progress => {
      return {} as any;
    },
    create: (_args: { message?: string | undefined; name?: string | undefined }): Plugin.Progress => {
      return {} as any;
    },
  },
};
