import MsGraphService from './msGraph.service.js';
import KintoneService  from './kintone.service.js';
import BaseError from '../utils/base.error.js';
import consoleCli from '../utils/consoleCli.js';

export default class MigrateKintoneAppService {
  appType;
  #msGraphService;
  #kintoneService;
  #app;
  #query;

  constructor({ 
    client, secret, sharepointFolder, host, app, token, query, folderFields, folderStructureName, msToken, logToken,
  }) {
    this.#app = app;
    this.appType = 'App';
    this.#query = query;
    this.#msGraphService = new MsGraphService({ client, secret, sharepointFolder, token: msToken, logToken });
    this.#kintoneService = new KintoneService({ host, app, token, folderFields, folderStructureName });
  }

  async run() {
    const conditionals = this.#query ? `using conditionals: ${this.#query}` : '';
    console.info(`💡 Migrating attachments for ${this.appType}: ${this.#app} ${conditionals}\n`);

    await this.#msGraphService.signIn();
    
    console.info('💡 Exporting kintone app records... ⏳\n');

    await consoleCli.loadingBarStart();
    try {
      const records = await this.#kintoneService.exportKintoneAttachments({ saveAttachments: true, query: this.#query });    
      if (!records) {
        throw new BaseError('⚠️ Error during export kintone projects!');
      }
    } finally {
      await consoleCli.loadingBarStop();
    }

    const projectRecords = await this.#kintoneService.getKintoneRecords();
    const fileFields = await this.#kintoneService.getFileFields();
    const projectRecordValues = Object.entries(projectRecords);

    if (!projectRecordValues.length) {
      console.info('⚠️ There isn\'t records to export.');
      return;
    }

    console.info(`💡 Exporting attachments to Sharepoint. Total record(s) (${projectRecordValues.length})... ⏳\n`);
    await consoleCli.loadingBarStart();
    try {
      for (const [key, record] of projectRecordValues) {
        console.info(`📤 Exporting files from key "%s"`, key);
        for (const [field, label] of Object.entries(fileFields)) {
          if (!record[field]) {
            continue;
          }
          const folderName = `${record.attachmentFolder}/${encodeURIComponent(label)}`;
          await Promise.all(record[field].map((file) => this.#msGraphService.uploadFile(this.#kintoneService.kintoneAttachments, folderName, file)));      
        }
      }
    } finally {
      await consoleCli.loadingBarStop();
    }

    console.info('💡 Deleting files created during migration... ⏳\n');
    await consoleCli.loadingBarStart();
    try {
      await this.#kintoneService.deleteFiles();
    } finally {
      await consoleCli.loadingBarStop();
    }

    console.info('🎉 The attachments was exported to sharepoint with success! 🎉');
  }
}