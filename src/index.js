import { createMigrateKintoneService } from './factories/migrateKintone.factory.js';
import { setup } from './utils/setup.js';

console.info(`🗂️  Migrate Kintone Attachments to Sharepoint\n`);

const { appType, ...migrationParams } = await setup();
const kintoneMigrationService = createMigrateKintoneService(appType, migrationParams);

const pageSize = 50;
let min = 4046;
let max = min + pageSize;
const queryFilter = `"Record_number>=$1 and Record_number<$2"`;
let next = true;
while (next) {
  const query = queryFilter.replace('$1', min).replace('$2', max);
  min = max;
  max = max + pageSize;
  kintoneMigrationService.query = query;
  next = await kintoneMigrationService.run();
  await kintoneMigrationService.export();
}