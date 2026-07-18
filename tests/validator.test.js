import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateDatabases } from '../validator.js';
import fs from 'fs';

vi.mock('fs');
vi.mock('../logger.js', () => ({
  logger: { error: vi.fn() },
}));

describe('validator', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should validate valid databases', () => {
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 1000 });
    fs.accessSync.mockImplementation(() => {});

    const dbs = [
      { name: 'db_cliente', mdf: 'path/db_cliente.mdf', ldf: 'path/db_cliente_log.ldf' },
    ];
    const result = validateDatabases(dbs);

    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
    expect(result.valid[0].mdfSize).toBe(1000);
  });

  it('should invalidate if mdf is missing', () => {
    fs.existsSync.mockImplementation((file) => file.endsWith('.ldf'));

    const dbs = [
      { name: 'db_cliente', mdf: 'path/db_cliente.mdf', ldf: 'path/db_cliente_log.ldf' },
    ];
    const result = validateDatabases(dbs);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].error).toContain('MDF file not found');
  });

  it('should invalidate if mdf is empty (size 0)', () => {
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 0 });
    fs.accessSync.mockImplementation(() => {});

    const dbs = [
      { name: 'db_cliente', mdf: 'path/db_cliente.mdf', ldf: 'path/db_cliente_log.ldf' },
    ];
    const result = validateDatabases(dbs);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].error).toContain('MDF file is empty');
  });
});
