import fs from 'fs';
import { logger } from './logger.js';

export function validateDatabases(databases) {
  const valid = [];
  const invalid = [];

  for (const db of databases) {
    try {
      if (!fs.existsSync(db.mdf)) {
        throw new Error(`MDF file not found: ${db.mdf}`);
      }
      if (!fs.existsSync(db.ldf)) {
        throw new Error(`LDF file not found: ${db.ldf}`);
      }

      // Check if files are readable and sizes
      const mdfStat = fs.statSync(db.mdf);
      const ldfStat = fs.statSync(db.ldf);

      fs.accessSync(db.mdf, fs.constants.R_OK);
      fs.accessSync(db.ldf, fs.constants.R_OK);

      if (mdfStat.size === 0) {
        throw new Error(`MDF file is empty: ${db.mdf}`);
      }

      valid.push({
        ...db,
        mdfSize: mdfStat.size,
        ldfSize: ldfStat.size,
      });
    } catch (err) {
      logger.error(`Validation failed for database ${db.name}: ${err.message}`);
      invalid.push({
        ...db,
        error: err.message,
      });
    }
  }

  return { valid, invalid };
}
