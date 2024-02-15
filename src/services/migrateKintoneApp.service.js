import MsGraphService from './msGraph.service.js';
import KintoneService  from './kintone.service.js';
import BaseError from '../utils/base.error.js';

export default class MigrateKintoneAppService {
  appType;
  #msGraphService;
  #kintoneService;
  #app;
  #query;

  constructor({ 
    client, secret, sharepointFolder, app, token, query, folderFields, folderStructureName,
  }) {
    this.#app = app;
    this.appType = 'App';
    this.#query = query;
    this.#msGraphService = new MsGraphService({ client, secret, sharepointFolder });
    this.#kintoneService = new KintoneService({ app, token, folderFields, folderStructureName });
  }

  async run() {
    const conditionals = this.#query ? `using conditionals: ${this.#query}` : '';
    console.info(`💡 Migrating attachments for ${this.appType}: ${this.#app} ${conditionals}\n`);

    await this.#msGraphService.signIn();
    
    console.info('💡 Exporting kintone app records... ⏳\n');
    const records = await this.#kintoneService.exportKintoneAttachments({ saveAttachments: true, query: this.#query })
    if (!records) {
      throw new BaseError('⚠️ Error during export kintone projects!');
    }

    const projectRecords = await this.#kintoneService.getKintoneRecords();
    const fileFields = await this.#kintoneService.getFileFields();

    console.info('💡 Exporting attachments to Sharepoint... ⏳\n');
    for (const record of Object.values(projectRecords)) {
      for (const [field, label] of Object.entries(fileFields)) {
        if (!record[field]) {
          continue;
        }
        await Promise.all(record[field].map((file) => this.#msGraphService.uploadFile(this.#kintoneService.kintoneAttachments, `${record.attachmentFolder}/${label}`, file)));      
      }
    }

    console.info('💡 Deleting files created during migration... ⏳\n');
    await this.#kintoneService.deleteFiles();

    console.info('🎉 The attachments was exported to sharepoint with success! 🎉');
  }
}