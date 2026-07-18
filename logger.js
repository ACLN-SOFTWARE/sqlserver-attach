import pino from 'pino';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.resolve('logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Generate log filename based on current date and time
const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
const logFile = path.join(logsDir, `${dateStr}.log`);

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        },
      },
      {
        target: 'pino/file',
        options: {
          destination: logFile,
          mkdir: true
        }
      }
    ]
  },
});
