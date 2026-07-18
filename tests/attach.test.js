import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAttach } from '../attach.js';
import * as scanner from '../scanner.js';
import * as validator from '../validator.js';
import * as docker from '../docker.js';
import * as sqlserver from '../sqlserver.js';

vi.mock('../scanner.js');
vi.mock('../validator.js');
vi.mock('../docker.js');
vi.mock('../sqlserver.js');
vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

describe('attach orchestrator', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return 0 success if no files found', async () => {
    scanner.scanDirectory.mockReturnValue([]);
    const result = await runAttach('/path', {});
    expect(result.success).toBe(0);
  });

  it('should run dry run successfully', async () => {
    const dbs = [{ name: 'db1', mdf: '1.mdf', ldf: '1.ldf' }];
    scanner.scanDirectory.mockReturnValue(dbs);
    validator.validateDatabases.mockReturnValue({ valid: dbs, invalid: [] });

    const result = await runAttach('/path', {}, { dryRun: true });
    expect(result.success).toBe(1);
    expect(result.dryRun).toBe(true);
    expect(docker.getContainerStatus).not.toHaveBeenCalled();
  });

  it('should execute full attach workflow', async () => {
    const dbs = [{ name: 'db1', mdf: '1.mdf', ldf: '1.ldf' }];
    scanner.scanDirectory.mockReturnValue(dbs);
    validator.validateDatabases.mockReturnValue({ valid: dbs, invalid: [] });
    docker.getContainerStatus.mockReturnValue('running');
    
    // Provide a mocked Listr execution by skipping actual Listr logic 
    // or since Listr runs tasks, we just let it run.
    docker.copyFilesToContainer.mockResolvedValue();
    sqlserver.waitForSqlServer.mockResolvedValue();
    sqlserver.attachDatabase.mockResolvedValue();

    const config = { container: 'sql1', parallel: 1, sqlPath: '/var' };
    const result = await runAttach('/path', config, {});

    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(docker.copyFilesToContainer).toHaveBeenCalled();
    expect(sqlserver.attachDatabase).toHaveBeenCalled();
  });
});
