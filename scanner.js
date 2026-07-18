import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

export function scanDirectory(basePath) {
  const result = [];

  if (!fs.existsSync(basePath)) {
    throw new Error(`Directory not found: ${basePath}`);
  }

  const stat = fs.statSync(basePath);

  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${basePath}`);
  }

  const entries = fs.readdirSync(basePath, { withFileTypes: true, recursive: true });

  const mdfFiles = [];
  const ldfFiles = [];

  // Categorize files
  for (const entry of entries) {
    if (entry.isFile()) {
      // Depending on Node version, entry.parentPath might be available, otherwise we use path.join
      // fs.readdirSync with recursive: true in Node 20+ returns objects where entry.path or entry.parentPath points to the dir
      const dirPath = entry.path || entry.parentPath || basePath; // fallback to basePath if recursive isn't fully supported in object

      let fullPath;
      if (entry.path || entry.parentPath) {
        fullPath = path.join(entry.path || entry.parentPath, entry.name);
      } else {
        // If recursive doesn't give path (older node, though Node 22 does), we'd need a custom walk.
        // Since we use Node 22+, entry.parentPath or entry.path is present.
        fullPath = path.join(dirPath, entry.name);
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.mdf') {
        mdfFiles.push(fullPath);
      } else if (ext === '.ldf') {
        ldfFiles.push(fullPath);
      }
    }
  }

  // Group by directory and name heuristics
  for (const mdf of mdfFiles) {
    const dir = path.dirname(mdf);
    const mdfName = path.basename(mdf, '.mdf');
    const mdfNameLower = mdfName.toLowerCase();

    // Look for a matching LDF in the same directory
    // Typically LDF is named like MDF, e.g. "db_cliente.mdf" and "db_cliente_log.ldf"
    let matchingLdf = ldfFiles.find((ldf) => {
      return (
        path.dirname(ldf) === dir &&
        path.basename(ldf, '.ldf').toLowerCase().startsWith(mdfNameLower)
      );
    });

    if (!matchingLdf) {
      // fallback: just find any ldf in the same dir if there's only one
      const ldfsInDir = ldfFiles.filter((ldf) => path.dirname(ldf) === dir);
      if (ldfsInDir.length === 1) {
        matchingLdf = ldfsInDir[0];
      }
    }

    if (matchingLdf) {
      result.push({
        name: mdfName,
        mdf: mdf,
        ldf: matchingLdf,
      });
      logger.debug(`Found pair: ${mdfName} (MDF: ${mdf}, LDF: ${matchingLdf})`);
    } else {
      logger.warn(`Could not find a matching LDF for MDF file: ${mdf}`);
    }
  }

  return result;
}
