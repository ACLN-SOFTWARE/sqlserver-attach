import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanDirectory } from '../scanner.js';
import fs from 'fs';

vi.mock('fs');
vi.mock('../logger.js', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('scanner', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should throw if directory does not exist', () => {
    fs.existsSync.mockReturnValue(false);
    expect(() => scanDirectory('/path')).toThrow('Directory not found');
  });

  it('should throw if path is not a directory', () => {
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ isDirectory: () => false });
    expect(() => scanDirectory('/path')).toThrow('Path is not a directory');
  });

  it('should group mdf and ldf correctly', () => {
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ isDirectory: () => true });

    // Mock entries matching Node 22 fs.readdirSync(..., {withFileTypes: true})
    fs.readdirSync.mockReturnValue([
      { name: 'db_cliente.mdf', isFile: () => true, parentPath: '/path' },
      { name: 'db_cliente_log.ldf', isFile: () => true, parentPath: '/path' },
      { name: 'other.txt', isFile: () => true, parentPath: '/path' },
      { name: 'alone.mdf', isFile: () => true, parentPath: '/path' }, // missing LDF
      { name: 'dummy.ldf', isFile: () => true, parentPath: '/path' }, // extra LDF to avoid fallback pairing alone.mdf with db_cliente_log.ldf
    ]);

    const result = scanDirectory('/path');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('db_cliente');
    expect(result[0].mdf.replace(/\\/g, '/')).toBe('/path/db_cliente.mdf');
    expect(result[0].ldf.replace(/\\/g, '/')).toBe('/path/db_cliente_log.ldf');
  });
});
