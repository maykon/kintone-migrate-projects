import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { spawn, BaseError } from '@maykoncapellari/cli-builder';
import NormalizeUtils from '../utils/normalize.js';
import { csvParser } from '../utils/csvParser.js';

export default class KintoneService {
  #host;
  #app;
  #appKey;
  #token;
  #kintoneAttachments;
  #kintoneCSV;
  #folderFields;
  #folderStructureName;
  #fileFields;
  #customHeaders;
  #fieldsInsideTable = new Set();

  constructor({ host, app, token, folderFields, appKey, folderStructureName, customHeaders }) {
    if (!host) {
      throw new BaseError('⚠️ The kintone Host is required!');
    }
    if (!app) {
      throw new BaseError('⚠️ The kintone ID of the app is required!');
    }
    if (!token) {
      throw new BaseError('⚠️ The kintone App\'s API token is required!');
    }
    this.#host = host;
    this.#app = app;
    this.#appKey = appKey || 'Record_number';
    this.#token = token;
    this.#kintoneAttachments = path.resolve(os.homedir(), 'atts', app);
    this.#kintoneCSV = path.resolve(os.homedir(), `kintone_app_${app}.csv`);
    this.#folderFields = folderFields || [];
    this.#folderStructureName = folderStructureName || ((record) => `#${record[this.#appKey]}`);
    this.#fileFields = null;
    this.#customHeaders = customHeaders || [];
  }

  get kintoneAttachments() {
    return this.#kintoneAttachments;
  }

  async exportKintoneAttachments({ saveAttachments, query, fields }) {
    const kintoneAttachments = saveAttachments ? ['--attachments-dir', this.#kintoneAttachments] : [];
    const kintoneConditional = query ? ['-c', query] : [];
    const kintoneFields = fields ? ['--fields', fields] : [];
    await spawn('mkdir', ['-p', this.#kintoneAttachments]);
    const recordsApp = await spawn('cli-kintone', [
          'record',
          'export',
          '--base-url',
          this.#host,
          '--app', 
          this.#app,
          '--api-token',
          this.#token,
          ...kintoneAttachments,
          ...kintoneConditional,
          ...kintoneFields,
        ],
        { 
          env: process.env,
          shell: true,
          maxBuffer: 1024 ** 3, 
        },
      )
      .catch(() => null);
    if (recordsApp){
      await fs.writeFile(this.#kintoneCSV, recordsApp);
    }
    return recordsApp;
  }

  async parseKintoneApp() {
    return await csvParser(this.#kintoneCSV);
  }

  async getSchemaApp() {
    return fetch(`${this.#host}/k/v1/app/form/fields.json?app=${this.#app}`, {
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

    this.#fieldsInsideTable.clear();
    const fields = await this.getSchemaApp();
    if (!Object.keys(fields).length) {
      return fields;
    }
    this.#fileFields = Object.entries(fields?.properties ?? {})
      .filter(([_, value]) => ['FILE', 'SUBTABLE'].includes(value.type))
      .reduce((acc, [key, value]) => {
        if (value.type === 'FILE') {
          acc[key] = NormalizeUtils.normalize(value.label);
        } else if (value.type === 'SUBTABLE') {
          Object.entries(value.fields)
          .forEach(([subKey, subValue]) => {
            if (subValue.type === 'FILE') {
              acc[subKey] = NormalizeUtils.normalize(subValue.label);
            } else {
              this.#fieldsInsideTable.add(subKey);
            }
          });
        }
        return acc;
      }, {});
    return this.#fileFields;
  };

  getHeaderMap(data, fileFields) {
    const headerMap = new Map();
    const headerFields = [this.#appKey, ...this.#customHeaders, ...this.#folderFields, ...fileFields];
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
      .map((r, row) => {
        return r
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
        .reduce((acc, r, _, raw) => {
          const [[key, value]] = Object.entries(r);
          acc[key] = value;
          return acc;
        }, {});
      })
      .reduce((acc, record, _, raw) => {
        acc[record[this.#appKey]] = acc[record[this.#appKey]] || record;
        acc[record[this.#appKey]]['attachmentFolder'] = this.#folderStructureName(acc[record[this.#appKey]]);
        Object.entries(record).forEach(([key, value]) => {
          if (fileFieldKeys.includes(key)) {
            acc[record[this.#appKey]][key] = [...new Set([...(acc[record[this.#appKey]][key] || []), ...value])];
            if (acc[record[this.#appKey]][key].length === 1 && acc[record[this.#appKey]][key][0] === '') {
              acc[record[this.#appKey]][key] = null;
            }
          } else if (this.#fieldsInsideTable.has(key) && !!value && value?.toString()?.trim().length > 0) {
            const oldValue = acc[record[this.#appKey]][key] || [];
            const arrValue = Array.isArray(oldValue) ? oldValue : [oldValue];
            acc[record[this.#appKey]][key] = [...arrValue, value];
          }
        });
        return acc;
      }, {});
  }

  async deleteFiles() {
    await fs.rm(this.#kintoneAttachments, { force: true, recursive: true });
  }
  
  async deleteCSVFiles() {
    await fs.rm(this.#kintoneCSV, { force: true });
  }

  get kintoneCSV() {
    return this.#kintoneCSV;
  }

  getRecordUrl(record) {
    return `https://pecc.kintone.com/k/${this.#app}/show#record=${record}`;
  }
  
}
  