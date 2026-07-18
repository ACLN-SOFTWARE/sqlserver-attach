import { execSync, spawn } from 'child_process';
import tar from 'tar-fs';
import path from 'path';
import { logger } from './logger.js';
import fs from 'fs';

export function getContainerStatus(containerName) {
  try {
    const output = execSync(`docker inspect -f "{{.State.Status}}" ${containerName}`, { stdio: 'pipe' }).toString().trim();
    return output; // 'running', 'exited', etc.
  } catch (err) {
    return null; // Not found
  }
}

export function startContainer(containerName) {
  logger.info(`Starting container: ${containerName}`);
  execSync(`docker start ${containerName}`);
}

export function runNewContainer(containerName, password, port) {
  logger.info(`Creating and starting new SQL Server container: ${containerName}`);
  const cmd = `docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=${password}" -p ${port}:1433 --name ${containerName} -d mcr.microsoft.com/mssql/server:2022-latest`;
  execSync(cmd);
}

export async function copyFilesToContainer(containerName, files, targetPath) {
  return new Promise((resolve, reject) => {
    logger.info(`Copying ${files.length} files to container ${containerName}:${targetPath} using tar stream`);
    
    // Ensure target path exists in container
    try {
      execSync(`docker exec ${containerName} mkdir -p ${targetPath}`);
    } catch(e) {
      logger.warn(`Failed to create directory ${targetPath} in container. It may already exist.`);
    }

    // Set up docker exec command to receive the tar stream
    const dockerTar = spawn('docker', ['exec', '-i', containerName, 'tar', 'x', '-C', targetPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    dockerTar.stderr.on('data', (data) => {
      logger.debug(`Docker tar stderr: ${data.toString()}`);
    });

    dockerTar.on('close', (code) => {
      if (code === 0) {
        logger.info('Files copied successfully.');
        
        // Change ownership to mssql user so SQL server can access the files
        try {
          execSync(`docker exec ${containerName} chown mssql:root ${targetPath}/*.mdf ${targetPath}/*.ldf`);
          logger.debug('Permissions updated to mssql:root');
        } catch(chownErr) {
          logger.warn(`Failed to update permissions: ${chownErr.message}`);
        }
        
        resolve();
      } else {
        reject(new Error(`docker tar process exited with code ${code}`));
      }
    });

    // Create a tar stream from the host paths
    // tar-fs packs a directory, but we have specific scattered files.
    // We can map them into the tar stream.
    const mapToTar = tar.pack(process.cwd(), {
      entries: files.map(f => path.relative(process.cwd(), f)),
      map: (header) => {
        // Place them at the root of the extracted tar (which is targetPath)
        header.name = path.basename(header.name);
        return header;
      }
    });

    mapToTar.on('error', (err) => {
      logger.error(`Error generating tar stream: ${err.message}`);
      reject(err);
    });

    mapToTar.pipe(dockerTar.stdin);
  });
}

export function cleanupFiles(containerName, files, targetPath) {
  for (const file of files) {
    const filename = path.basename(file);
    const fullPath = `${targetPath}/${filename}`;
    try {
      execSync(`docker exec ${containerName} rm -f "${fullPath}"`);
      logger.debug(`Removed temporary file from container: ${fullPath}`);
    } catch (err) {
      logger.warn(`Failed to remove temporary file: ${fullPath} - ${err.message}`);
    }
  }
}
