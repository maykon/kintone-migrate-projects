import MsGraphService from './msGraph.service.js';
import KintoneService  from './kintone.service.js';
import BaseError from '../utils/base.error.js';

const app = process.env.KINTONE_APP;
const token = process.env.KINTONE_TOKEN;
const query = process.env.KINTONE_APP_QUERY;
const client = process.env.MS_GRAPH_CLIENT_ID;
const secret = process.env.MS_GRAPH_CLIENT_SECRET;
const sharepointFolder = process.env.MS_SHAREPOINT_FOLDER ?? 'me/drive/root';
const scopes = 'openid offline_access User.Read Files.ReadWrite.All';
const redirectUri = 'https://login.live.com/oauth20_desktop.srf';

const projectFolderFields = ["client", "property_occupant", "project_type", "pecc_project_number", "project_address", "project_address_floor", "project_city", "project_address_suite", "project_state", "project_zip", "Text_19"];

const folderStructureName = (record) => {
  const address = `${record.project_city}, ${record.project_state} - ${record.project_address}`;
  return [record.client, record.property_occupant, record.project_type]
    .filter((r) => !!r)
    .join('/')
    .concat('/')
    .concat(record.pecc_project_number)
    .concat(' - ')
    .concat(address);
};

const msGraphService = new MsGraphService({ client, secret, scopes, redirectUri, sharepointFolder });
const kintoneService = new KintoneService({ app, token, folderFields: projectFolderFields, folderStructureName });

export const migrateProjects = async () => {
  const conditionals = query ? `using conditionals: ${query}` : '';
  console.info(`🗂️  Migrating attachments for App: ${app} ${conditionals}\n`);

  await msGraphService.signIn();
  
  console.info('💡 Exporting kintone app records... ⏳\n');
  const records = await kintoneService.exportKintoneAttachments({ saveAttachments: true, query })
  if (!records) {
    throw new BaseError('⚠️ Error during export kintone projects!');
  }

  const projectRecords = await kintoneService.getKintoneRecords();
  const fileFields = await kintoneService.getFileFields();

  console.info('💡 Exporting attachments to Sharepoint... ⏳\n');
  for (const record of Object.values(projectRecords)) {
    for (const [field, label] of Object.entries(fileFields)) {
      if (!record[field]) {
        continue;
      }
      await Promise.all(record[field].map((file) => msGraphService.uploadFile(kintoneService.kintoneAttachments, `${record.attachmentFolder}/${label}`, file)));      
    }
  }
  console.info('🎉 The attachments was exported to sharepoint with success! 🎉');
};