import sql from 'mssql';
import { logger } from './logger.js';

export async function waitForSqlServer(config) {
  const timeoutMs = config.waitTimeout * 1000;
  const start = Date.now();
  
  const sqlConfig = {
    user: config.user,
    password: config.password,
    server: config.host,
    port: config.port,
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 5000,
    }
  };

  logger.info('Waiting for SQL Server to accept connections...');
  
  while (Date.now() - start < timeoutMs) {
    try {
      const pool = await sql.connect(sqlConfig);
      await pool.close();
      logger.info('SQL Server is ready.');
      return;
    } catch (err) {
      logger.debug(`SQL Server not ready yet: ${err.message}`);
      await new Promise(res => setTimeout(res, 2000)); // wait 2s before retry
    }
  }

  throw new Error(`Timeout waiting for SQL Server after ${config.waitTimeout} seconds.`);
}

export async function attachDatabase(config, dbName, mdfPath, ldfPath) {
  const sqlConfig = {
    user: config.user,
    password: config.password,
    server: config.host,
    port: config.port,
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      requestTimeout: 120000, // 2 minutes for attach operations
    }
  };

  let pool;
  try {
    pool = await sql.connect(sqlConfig);
    
    if (config.replace) {
      // Check if DB exists
      const checkResult = await pool.request()
        .input('dbName', sql.NVarChar, dbName)
        .query('SELECT name FROM sys.databases WHERE name = @dbName');
        
      if (checkResult.recordset.length > 0) {
        logger.info(`Database ${dbName} exists. Replacing...`);
        // Drop it safely
        await pool.request().query(`
          ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
          DROP DATABASE [${dbName}];
        `);
        logger.debug(`Dropped existing database ${dbName}`);
      }
    }

    logger.info(`Attaching database ${dbName}...`);
    // Create database for attach
    const query = `
      CREATE DATABASE [${dbName}]
      ON (FILENAME = '${mdfPath}'),
         (FILENAME = '${ldfPath}')
      FOR ATTACH;
    `;
    
    await pool.request().query(query);
    logger.info(`Database ${dbName} attached successfully.`);
    
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}
