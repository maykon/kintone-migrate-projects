import path from 'path';
import MigrateKintoneAppService from "./migrateKintoneApp.service.js";
import NormalizeUtils from '../utils/normalize.js';

export default class MigrateKintoneProjectNewestService extends MigrateKintoneAppService {
  static #projectFolderFields = ["pecc_project_number"];
  static #fileFieldsCodeFilter = ['Attachment_26', 'Attachment_28', 'work_authorization', 'Attachment_24'];
  static #kintoneCustomHeaders = ['Text_20', 'Text_21', 'Work_Authorization_Received', 'Text_18'];

  static #fileFieldsRenamed = (record) => ({
    'Attachment_26': record.Text_20,
    'Attachment_28': record.Text_21,
    'work_authorization': record.Work_Authorization_Received,
    'Attachment_24': record.Text_18,
  });

  static #folderStructureName(record) {
    return [`#${record.pecc_project_number}`]
      .filter((f) => !!f)
      .map(NormalizeUtils.encode)
      .join('/');
  }

  constructor(params) {
    super({ 
      ...params,
      folderFields: MigrateKintoneProjectNewestService.#projectFolderFields,
      folderStructureName: MigrateKintoneProjectNewestService.#folderStructureName,
      customHeaders: MigrateKintoneProjectNewestService.#kintoneCustomHeaders,
    });
    super.appType = 'ProjectNewest';
  }

  async getFileFields() {
    const fileFields = await super.getFileFields();
    return Object.entries(fileFields)
      .filter(([key]) => MigrateKintoneProjectNewestService.#fileFieldsCodeFilter.some((ff) => ff === key))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }

  renameAttachmentFile(record, field, file, index) {
    const renamed = MigrateKintoneProjectNewestService.#fileFieldsRenamed(record)[field];
    if (!renamed) {
      return file;
    }
    const ext = path.extname(file);
    const defaultFileName = path.basename(file);
    const fileName = (Array.isArray(renamed) ? (renamed[index] || renamed[0]) : renamed) || defaultFileName;
    return `${fileName}_${index}${ext}`;
  }
}