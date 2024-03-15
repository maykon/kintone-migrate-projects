import MigrateKintoneAppService from "../services/migrateKintoneApp.service.js";
import MigrateKintoneProjectService from "../services/migrateKintoneProjects.service.js";
import MigrateKintoneProposalService from "../services/migrateKintoneProposal.service.js";
import BaseError from "../utils/base.error.js";

export const migrateAppTypes = {
  project: 'Project',
  proposal: 'Proposal',
  app: 'App',
};

export const migrateAppTypesAvailable = () => Object.keys(migrateAppTypes).join(', ');

export const isValidAppType = (type) => {
  const foundType = Object.keys(migrateAppTypes).find((t) => t === type);
  if (!foundType) {
    throw new BaseError('App type invalid!');
  }
};

export const currentMigrateAppTypes = {
  project: MigrateKintoneProjectService,
  proposal: MigrateKintoneProposalService,
  app: MigrateKintoneAppService,
};

export const createMigrateKintoneService = (type, params) => {
  const migrateService = currentMigrateAppTypes[type];
  if (!migrateService) {
    throw new BaseError('Service not implemented yet!');
  }
  return new migrateService(params);
};