import MigrateKintoneAppService from "./migrateKintoneApp.service.js";

export default class MigrateKintoneProjectService extends MigrateKintoneAppService {
  static #projectFolderFields = ["client", "property_occupant", "project_type", "pecc_project_number", "project_address", "project_address_floor", "project_city", "project_address_suite", "project_state", "project_zip", "Text_19"];

  static #folderStructureName(record) {
    const address = encodeURIComponent(`${record.project_city}, ${record.project_state} - ${record.project_address}`);
    return [record.client, record.property_occupant, record.project_type, `#${record.pecc_project_number} - ${address}`]
      .filter((f) => !!f)
      .map((f) => encodeURIComponent(f.trim().replace(/\r|\t/g, '').replace(/\n/g, ' - ')))
      .join('/');
  }

  constructor(params) {
    super({ 
      ...params,
      folderFields: MigrateKintoneProjectService.#projectFolderFields,
      folderStructureName: MigrateKintoneProjectService.#folderStructureName,
    });
    super.appType = 'Project';
  }
}