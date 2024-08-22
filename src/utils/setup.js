import { isValidAppType, migrateAppTypesAvailable } from '../factories/migrateKintone.factory.js';
import { prompt, setupParams } from '@maykoncapellari/cli-builder';

const defaultAppType = 'app';
const sharepointDefaultFolder = 'me/drive/root';
const defaultSharepointUrl = 'Shared Documents/';
const defaultClientValue = process.env.MS_GRAPH_ACCESS_TOKEN ? 'token' : undefined;
const params = {
  appType: process.env.KINTONE_APP_TYPE,
  host: process.env.KINTONE_HOST,
  app: process.env.KINTONE_APP,
  token: process.env.KINTONE_TOKEN,
  query: process.env.KINTONE_APP_QUERY,
  fields: process.env.KINTONE_APP_FIELDS,
  msToken: process.env.MS_GRAPH_ACCESS_TOKEN,
  domain: process.env.MS_DOMAIN,
  client: process.env.MS_GRAPH_CLIENT_ID ?? defaultClientValue,
  secret: process.env.MS_GRAPH_CLIENT_SECRET ?? defaultClientValue,
  sharepointFolder: process.env.MS_SHAREPOINT_FOLDER,
  sharepointFolderUrl: process.env.MS_SHAREPOINT_FOLDER_URL,
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
  fields: {
    ask: 'Set the Kintone fields that will specify what fields will be returned (Empty will return all fields): ',
    value: params.fields,
  },
  client: {
    ask: 'Set the Microsoft APP ClientID used to connect to sharepoint: ',
    value: params.client,
  },
  secret: {
    ask: 'Set the Microsoft APP ClientSecret used to connect to sharepoint: ',
    value: params.secret,
  },
  domain: {
    ask: 'Set the Microsoft SharePoint domain: ',
    value: params.domain,
  },
  sharepointFolder: {
    ask: 'Set the Microsoft SharePoint folder path that will be used to export the attachments (me/drive/root): ',
    value: params.sharepointFolder,
    default: sharepointDefaultFolder,
  },
  sharepointFolderUrl: {
    ask: 'Set the Microsoft SharePoint folder Url (Shared Documents/): ',
    value: params.sharepointFolderUrl,
    default: defaultSharepointUrl,
  },
};

export const setup = async () => setupParams(paramsInfo, params);