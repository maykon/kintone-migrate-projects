import { isValidAppType, migrateAppTypesAvailable } from '../factories/migrateKintone.factory.js';
import { prompt } from './prompt.js';

const defaultAppType = 'app';
const sharepointDefaultFolder = 'me/drive/root';
const defaultClientValue = process.env.MS_GRAPH_ACCESS_TOKEN ? 'token' : undefined;
const params = {
  appType: process.env.KINTONE_APP_TYPE,
  host: process.env.KINTONE_HOST,
  app: process.env.KINTONE_APP,
  token: process.env.KINTONE_TOKEN,
  query: process.env.KINTONE_APP_QUERY,
  msToken: process.env.MS_GRAPH_ACCESS_TOKEN,
  client: process.env.MS_GRAPH_CLIENT_ID ?? defaultClientValue,
  secret: process.env.MS_GRAPH_CLIENT_SECRET ?? defaultClientValue,
  sharepointFolder: process.env.MS_SHAREPOINT_FOLDER,
  logToken: process.env.MS_GRAPH_LOG_TOKEN,
};
const paramsInfo = {
  appType: {
    ask: `The kintone App type (${migrateAppTypesAvailable()}): `,
    value: params.appType,
    validate: isValidAppType,
    default: defaultAppType,
  },
  host: {
    ask: 'Set the kintone Host: ',
    value: params.host,
  },
  app: {
    ask: 'Set the kintone ID of the app: ',
    value: params.app,
  },   
  token: {
    ask: 'Set the kintone App\'s API token: ',
    value: params.token,
  },
  query: {
    ask: 'Set the Kintone query that will specify what records will be returned (Empty will return all records): ',
    value: params.query,
  },
  client: {
    ask: 'Set the Microsoft APP ClientID used to connect to sharepoint: ',
    value: params.client,
  },
  secret: {
    ask: 'Set the Microsoft APP ClientSecret used to connect to sharepoint: ',
    value: params.secret,
  },
  sharepointFolder: {
    ask: 'Set the Microsoft SharePoint folder path that will be used to export the attachments (me/drive/root): ',
    value: params.sharepointFolder,
    default: sharepointDefaultFolder,
  },
};

export const setupParams = async () => {
  const shouldRequestParams = Object.entries(paramsInfo)
    .map(([key, param]) => [key, { ...param, value: param.value?.trim() }])
    .filter(([_, param]) => !param.value?.length);

  if (shouldRequestParams.length) {
    console.info('💡 Setup step\n');
    for (const [key, param] of shouldRequestParams) {
      const response = (await prompt.question(param.ask)) || param.default;
      param?.validate?.(response);
      params[key] = response;
    };
    console.log();
  }

  return params;
};