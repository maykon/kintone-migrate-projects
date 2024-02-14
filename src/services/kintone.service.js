import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from '../utils/spawnAsync.js';
import { csvParser } from '../utils/csvParser.js';
import BaseError from '../utils/base.error.js';

export default class KintoneService {
  #app;
  #appKey;
  #token;
  #kintoneAttachments;
  #kintoneCSV;
  #folderFields;
  #folderStructureName;
  #fileFields;

  constructor({ app, token, folderFields, appKey, folderStructureName }) {
    if (!app) {
      throw new BaseError('⚠️ The kintone ID of the app is required!');
    }
    if (!token) {
      throw new BaseError('⚠️ The kintone App\'s API token is required!');
    }
    this.#app = app;
    this.#appKey = appKey || 'Record_number';
    this.#token = token;
    this.#kintoneAttachments = path.resolve(os.homedir(), 'atts', app);
    this.#kintoneCSV = path.resolve(os.homedir(), `kintone_app_${app}.csv`);
    this.#folderFields = folderFields || [];
    this.#folderStructureName = folderStructureName || (() => this.#appKey);
    this.#fileFields = null;
  }

  get kintoneAttachments() {
    return this.#kintoneAttachments;
  }

  async exportKintoneAttachments({ saveAttachments, query }) {
    const kintoneAttachments = saveAttachments ? ['--attachments-dir', this.#kintoneAttachments] : [];
    const kintoneConditional = query ? ['-c', query] : [];
    await spawn('mkdir', ['-p', this.#kintoneAttachments]);
    const recordsApp = await spawn('cli-kintone', [
          'record',
          'export',
          '--base-url',
          'https://pecc.kintone.com',
          '--app', 
          this.#app,
          '--api-token',
          this.#token,
          ...kintoneAttachments,
          ...kintoneConditional,
        ],
        { 
          env: process.env,
          shell: true,
        },
      )
      .catch((error) => null);
    if (recordsApp){
      await fs.writeFile(this.#kintoneCSV, recordsApp);
    }
    return recordsApp;
  }

  async parseKintoneApp() {
    return await csvParser(this.#kintoneCSV);
  }

  async getSchemaApp() {
    return fetch(`https://pecc.kintone.com/k/v1/app/form/fields.json?app=${this.#app}`, {
      headers: {
        'X-Cybozu-Api-Token': this.#token,
      }
    }).then((r) => r.json())
    .catch(() => {});
  }

  async getFileFields() {
    if (this.#fileFields) {
      return this.#fileFields;
    }

    const fields = await this.getSchemaApp();
    if (!Object.keys(fields).length) {
      return fields;
    }
    this.#fileFields = Object.entries(fields?.properties ?? {})
      .filter(([_, value]) => value.type === 'FILE')
      .reduce((acc, [key, value]) => {
        acc[key] = value.label;
        return acc;
      }, {});
    return this.#fileFields;
  };

  getHeaderMap(data, fileFields) {
    const headerMap = new Map();
    const headerFields = [this.#appKey, ...this.#folderFields, ...fileFields];
    data.forEach((h, index) => {
      if (headerFields.includes(h)) {
        headerMap.set(index, h);
      }
    });
    return headerMap;
  }

  async getKintoneRecords() {    
    const data = await this.parseKintoneApp();
    const fileFields = await this.getFileFields();
    const fileFieldKeys = Object.keys(fileFields);
    const headerMap = this.getHeaderMap(data[0], fileFieldKeys);
    return data.slice(1)
      .map((r) => r
        .map((value, index) => {
          if(!headerMap.has(index)) {
            return null;
          }
          const key = headerMap.get(index);
          let valueField = value;
          if (fileFieldKeys.includes(key)) {
            valueField = value.split('\n');
          }
          return ({ [key]: valueField });
        })
        .filter(r => r)
        .reduce((acc, r) => {
          const [[key, value]] = Object.entries(r);
          acc[key] = value;          
          return acc;
        }, {})
      )
      .reduce((acc, record) => {
        acc[record[this.#appKey]] = acc[record[this.#appKey]] || record;
        acc[record[this.#appKey]]['attachmentFolder'] = this.#folderStructureName(acc[record[this.#appKey]]);
        Object.entries(record).forEach(([key, value]) => {
          if (fileFieldKeys.includes(key)) {
            acc[record[this.#appKey]][key] = [...new Set([...(acc[record[this.#appKey]][key] || []), ...value])];
            if (acc[record[this.#appKey]][key].length === 1 && acc[record[this.#appKey]][key][0] === '') {
              acc[record[this.#appKey]][key] = null;
            }
          }          
        });
        return acc;
      }, {});
  }

  
}
  