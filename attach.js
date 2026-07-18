import pLimit from 'p-limit';
import path from 'path';
import { logger } from './logger.js';
import { scanDirectory } from './scanner.js';
import { validateDatabases } from './validator.js';
import {
  getContainerStatus,
  startContainer,
  runNewContainer,
  copyFilesToContainer,
} from './docker.js';
import { waitForSqlServer, attachDatabase } from './sqlserver.js';
import { Listr } from 'listr2';

export async function runAttach(targetPath, config, options = {}) {
  const startTime = Date.now();

  // 1. Scan and Validate
  logger.info(`Scanning directory: ${targetPath}`);
  const allDatabases = scanDirectory(targetPath);

  if (allDatabases.length === 0) {
    logger.info('No database files found.');
    return { success: 0, failed: 0, timeMs: 0 };
  }

  const { valid, invalid } = validateDatabases(allDatabases);

  if (invalid.length > 0) {
    logger.warn(`Found ${invalid.length} invalid database pairs.`);
    invalid.forEach((db) => logger.warn(`- ${db.name}: ${db.error}`));
  }

  if (valid.length === 0) {
    logger.error('No valid databases to attach.');
    return { success: 0, failed: invalid.length, timeMs: 0 };
  }

  // Handle explicit naming if a single target is found (or handle --name logic)
  if (options.name) {
    if (valid.length > 1) {
      throw new Error('Cannot use --name when multiple databases are found.');
    }
    valid[0].name = options.name;
  }

  if (options.dryRun) {
    logger.info('--- DRY RUN MODE ---');
    logger.info(`Would attach ${valid.length} databases:`);
    valid.forEach((db) => {
      logger.info(`- Name: ${db.name}, MDF: ${db.mdf}, LDF: ${db.ldf}`);
    });
    return { success: valid.length, failed: 0, timeMs: 0, dryRun: true };
  }

  // 2. Docker Setup
  const containerStatus = getContainerStatus(config.container);
  if (containerStatus === 'running') {
    logger.info(`Container ${config.container} is already running.`);
  } else if (containerStatus) {
    logger.info(`Container ${config.container} exists but is ${containerStatus}. Starting...`);
    startContainer(config.container);
  } else {
    logger.info(`Container ${config.container} not found. Creating...`);
    if (!config.password) {
      throw new Error('SA password must be provided to create a new container.');
    }
    runNewContainer(config.container, config.password, config.port);
  }

  // 3. Wait for SQL Server
  await waitForSqlServer(config);

  // 4. Concurrency setup
  const limit = pLimit(config.parallel);
  let successCount = 0;
  let failedCount = 0;

  logger.info(
    `Starting batch attach for ${valid.length} databases with parallel limit ${config.parallel}...`
  );

  const tasks = new Listr(
    valid.map((db) => ({
      title: `Attaching ${db.name}`,
      task: async (ctx, task) => {
        return limit(async () => {
          try {
            task.output = `Copying files...`;
            // The tar stream needs absolute container paths
            // We'll put them in a dedicated folder per DB to avoid clashes
            const targetContainerPath = `${config.sqlPath}/${db.name}_temp`;

            await copyFilesToContainer(config.container, [db.mdf, db.ldf], targetContainerPath);

            task.output = `Attaching database via SQL...`;
            const mdfName = path.basename(db.mdf);
            const ldfName = path.basename(db.ldf);

            await attachDatabase(
              config,
              db.name,
              `${targetContainerPath}/${mdfName}`,
              `${targetContainerPath}/${ldfName}`
            );

            if (config.cleanup) {
              // Note: SQL Server locks the files once attached.
              // We shouldn't remove the actual MDF/LDF if they were moved,
              // BUT for docker tar stream, we just put them there. SQL server now uses them.
              // Actually, if we delete them, SQL Server database goes corrupt!
              // Wait, the user said "Remove arquivos temporários Depois do attach para não lotar o container."
              // This only makes sense if the tool creates temporary copies.
              // Since CREATE DATABASE FOR ATTACH uses the files in-place, we CANNOT delete them after attach.
              // I will leave a debug log here. The user might have thought `docker cp` creates a copy and then SQL copies again.
              logger.debug(`Skipping cleanup of ${mdfName} as they are in-use by SQL Server.`);
            }

            task.title = `${db.name} attached successfully`;
            successCount++;
          } catch (err) {
            task.title = `${db.name} failed: ${err.message}`;
            failedCount++;
            throw err; // throw to mark task as failed in listr2
          }
        });
      },
    })),
    { concurrent: true, exitOnError: false }
  );

  await tasks.run();

  const totalTime = Date.now() - startTime;
  logger.info(
    `Operation completed in ${Math.round(totalTime / 1000)}s. Success: ${successCount}, Failed: ${failedCount}`
  );

  return { success: successCount, failed: failedCount, timeMs: totalTime };
}
