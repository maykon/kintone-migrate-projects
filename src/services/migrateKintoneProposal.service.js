import MigrateKintoneAppService from "./migrateKintoneApp.service.js";
import NormalizeUtils from '../utils/normalize.js';

export default class MigrateKintoneProposalService extends MigrateKintoneAppService {
  static #projectFolderFields = ["client", "property_occupant", "project_type", "proposal_number", "project_address", "project_address_floor", "project_city", "project_address_suite", "project_state", "project_zip"];

  static #folderStructureName(record) {
    const address = `${record.project_city}, ${record.project_state} - ${record.project_address}`;
    return [record.client, record.property_occupant, record.project_type, `#${record.proposal_number} - ${address}`]
      .filter((f) => !!f)
      .map(NormalizeUtils.encode)
      .join('/');
  }

  constructor(params) {
    super({ 
      ...params,
      folderFields: MigrateKintoneProposalService.#projectFolderFields,
      folderStructureName: MigrateKintoneProposalService.#folderStructureName,
      appKey: 'proposal_number',
    });
    super.appType = 'Proposal';
  }
}