import { createMigrateKintoneService } from './factories/migrateKintone.factory.js';
import { setupParams } from './utils/setup.js';

console.info(`🗂️  Migrate Kintone Attachments to Sharepoint\n`);

const { appType, ...migrationParams } = await setupParams();
const kintoneMigrationService = createMigrateKintoneService(appType, migrationParams);

await kintoneMigrationService.run();