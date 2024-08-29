import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import MsGraphService from './msGraph.service.js';
import KintoneService  from './kintone.service.js';
import { BaseError, consoleCli, spawn } from '@maykoncapellari/cli-builder';
import { readFile, writeFile } from 'fs/promises';

export default class MigrateKintoneAppService {
  appType;
  #msGraphService;
  #kintoneService;
  #app;
  #query;
  #fields;
  #exportedTimes;

  constructor({ 
    domain, client, secret, sharepointFolder, sharepointFolderUrl, host, app, appKey, token, query, folderFields, folderStructureName, msToken, logToken, customHeaders, fields,
  }) {
    this.#app = app;
    this.appType = 'App';
    this.#query = query;
    this.#fields = fields;
    this.#msGraphService = new MsGraphService({ domain, client, secret, sharepointFolder, sharepointFolderUrl, token: msToken, logToken });
    this.#kintoneService = new KintoneService({ host, app, token, folderFields, folderStructureName, appKey, customHeaders });
    this.#exportedTimes = 0;
  }

  set query(query) {
    this.#query = query;
  }

  async getFileFields() {
    return this.#kintoneService.getFileFields();
  }

  #getModuleDir(folderName) {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', folderName);
  }

  async #createModuleDir(folderName) {
    const moduleDir = this.#getModuleDir(folderName);
    await spawn('mkdir', ['-p', moduleDir]);
  }

  #getModuleFilePath(folderName, fileName) {
    const moduleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', folderName);
    return path.resolve(moduleDir, fileName);
  }

  async run() {
    const conditionals = this.#query ? `using conditionals: ${this.#query}` : '';
    console.info(`💡 Migrating attachments for ${this.appType}: ${this.#app} ${conditionals}\n`);

    await this.#msGraphService.signIn();
    
    console.info('💡 Exporting kintone app records... ⏳\n');

    await consoleCli.loadingBarStart();
    try {
      const records = await this.#kintoneService.exportKintoneAttachments({ 
        saveAttachments: true, query: this.#query, fields: this.#fields,
      });    
      if (!records) {
        throw new BaseError('⚠️ Error during export kintone projects!');
      }
    } finally {
      await consoleCli.loadingBarStop();
    }

    await this.#createModuleDir('exported');
    const recordsFile = this.#getModuleFilePath('exported', `exported_${this.appType}_${this.#app}.json`);

    // Get and save Kintone Records
    const projectRecords = await this.#kintoneService.getKintoneRecords();
    const fileFields = await this.getFileFields();
    await writeFile(recordsFile, JSON.stringify(projectRecords));
    
    /*
    // Loading Kintone records
    const fileFields = await this.getFileFields();
    const projectRecords = JSON.parse(await readFile(recordsFile));
    */
    
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
          for (const [index, file] of record[field].entries()) {
            if (!file?.toString()?.trim()) {
              continue;
            }
            const renamedFile = this.renameAttachmentFile(record, field, file, index);
            await this.#msGraphService.uploadFile({ 
              attachmentDir: this.#kintoneService.kintoneAttachments,
              folderName, 
              file,
              renamedFile,
              conflict: 'replace',
            });
          }
        }
      }
    } finally {
      await consoleCli.loadingBarStop();
    }

    console.info('💡 Deleting files created during migration... ⏳\n');
    await consoleCli.loadingBarStart();
    try {
      // await this.#kintoneService.deleteFiles();
    } finally {
      await consoleCli.loadingBarStop();
    }

    console.info('🎉 The attachments was exported to sharepoint with success! 🎉');
    return true;
  }

  renameAttachmentFile(record, field, file, index) {
    return file;
  }

  async export() {
    console.info('💡 Generating CSV with the files exported... ⏳\n');

    if (!fs.existsSync(this.#kintoneService.kintoneCSV)) {
      await consoleCli.loadingBarStart();
      try {
        const records = await this.#kintoneService.exportKintoneAttachments({ query: this.#query });
        if (!records) {
          throw new BaseError('⚠️ Error during export kintone projects!');
        }
      } finally {
        await consoleCli.loadingBarStop();
      }
    }

    const projectRecords = await this.#kintoneService.getKintoneRecords();
    const fileFields = await this.getFileFields();
    const projectRecordValues = Object.entries(projectRecords);

    if (!projectRecordValues.length) {
      console.info('⚠️ There isn\'t records to export.');
      return;
    }

    const kintoneFile = this.#getModuleFilePath('exported', `exported_${this.appType}_${this.#app}_${++this.#exportedTimes}.csv`);
    const exported = fs.createWriteStream(kintoneFile);
    await consoleCli.loadingBarStart();
    try {      
      exported.write('Record,App Type,Project Address Suite,Client,Kintone URL,SharePoint Folder,SharePoint File URL\n');
      for (const [key, record] of projectRecordValues) {
        for (const [field, label] of Object.entries(fileFields)) {
          if (!record[field]) {
            continue;
          }
          const folderName = `${record.attachmentFolder}/${encodeURIComponent(label)}`;
          let index = 0;
          for (const file of record[field]) {
            const renamedFile = this.renameAttachmentFile(record, field, file, index++);
            const fileUrl = `${folderName}/${encodeURIComponent(renamedFile)}`;
            exported.write(`${key},${this.appType},"${record.project_address_suite}","${record.client}",${this.#kintoneService.getRecordUrl(key)},"${this.#msGraphService.getSharepointUrl(record.attachmentFolder)}","${this.#msGraphService.getSharepointUrl(fileUrl)}"\n`);
          }
        }
      }
    } finally {
      exported.close();
      await consoleCli.loadingBarStop();
    }
    console.info('🎉 The file was generated with success! 🎉');
  }
}