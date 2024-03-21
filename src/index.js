import { createMigrateKintoneService } from './factories/migrateKintone.factory.js';
import { setup } from './utils/setup.js';

console.info(`🗂️  Migrate Kintone Attachments to Sharepoint\n`);

const { appType, ...migrationParams } = await setup();
const kintoneMigrationService = createMigrateKintoneService(appType, migrationParams);

await kintoneMigrationService.run();
await kintoneMigrationService.export();
