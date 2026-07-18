import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { z } from 'zod';
import { logger } from './logger.js';

const configSchema = z.object({
  container: z.string().default('sqlserver'),
  host: z.string().default('localhost'),
  port: z.number().int().positive().default(1433),
  user: z.string().default('sa'),
  password: z.string(),
  sqlPath: z.string().default('/var/opt/mssql/data'),
  parallel: z.number().int().positive().default(1),
  cleanup: z.boolean().default(true),
  replace: z.boolean().default(false),
  waitTimeout: z.number().int().positive().default(180),
});

export function loadConfig(cliArgs = {}, configPath = 'sqlattach.yml') {
  let yamlConfig = {};

  const fullPath = path.resolve(configPath);
  if (fs.existsSync(fullPath)) {
    try {
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      yamlConfig = yaml.parse(fileContent) || {};
      logger.debug(`Loaded config from ${configPath}`);
    } catch (err) {
      logger.error(`Error parsing YAML config: ${err.message}`);
      throw new Error(`Failed to parse config file: ${configPath}`);
    }
  } else {
    logger.debug(`Config file ${configPath} not found. Using defaults and CLI args.`);
  }

  // Merge YAML config with CLI arguments (CLI args take precedence)
  const mergedConfig = {
    ...yamlConfig,
    ...cliArgs,
  };

  // Remove undefined values to avoid overwriting defaults incorrectly
  Object.keys(mergedConfig).forEach((key) => {
    if (mergedConfig[key] === undefined) {
      delete mergedConfig[key];
    }
  });

  try {
    const validatedConfig = configSchema.parse(mergedConfig);
    logger.debug('Configuration validated successfully');
    return validatedConfig;
  } catch (err) {
    logger.error('Configuration validation failed: ' + err.message);
    throw new Error('Invalid configuration');
  }
}
