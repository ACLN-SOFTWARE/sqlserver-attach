#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { loadConfig } from './config.js';
import { runAttach } from './attach.js';
import { logger } from './logger.js';

const program = new Command();

program
  .name('sqlattach')
  .description('CLI to automate attaching SQL Server databases in Docker')
  .version('1.0.0')
  .argument('<path>', 'Directory containing MDF/LDF files to scan and attach')
  .option('-n, --name <name>', 'Specific name for the database (only works if 1 DB is found)')
  .option('--replace', 'Overwrite existing database with the same name', false)
  .option('-p, --parallel <number>', 'Number of concurrent attach operations', parseInt)
  .option('--container <name>', 'Docker container name')
  .option('--dry-run', 'Show what would be done without making changes', false)
  .action(async (targetPath, options) => {
    try {
      const fullPath = path.resolve(targetPath);
      logger.info(`Starting sqlattach on path: ${fullPath}`);

      const config = loadConfig({
        replace: options.replace,
        parallel: options.parallel,
        container: options.container,
      });

      const result = await runAttach(fullPath, config, options);

      console.log('\n════════════════════════════════════');
      console.log(` Tempo........ ${Math.round(result.timeMs / 1000)} s`);
      console.log(` Sucesso...... ${result.success}`);
      console.log(` Falha........ ${result.failed}`);
      console.log('════════════════════════════════════\n');

      if (result.failed > 0) {
        process.exit(1);
      }
    } catch (err) {
      logger.error(`Critical error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
