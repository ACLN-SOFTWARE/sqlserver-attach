import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainerStatus, startContainer, runNewContainer } from '../docker.js';
import child_process from 'child_process';

vi.mock('child_process');
vi.mock('tar-fs');
vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

describe('docker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getContainerStatus should return status if found', () => {
    child_process.execSync.mockReturnValue(Buffer.from('running\n'));
    expect(getContainerStatus('sql1')).toBe('running');
  });

  it('getContainerStatus should return null if not found', () => {
    child_process.execSync.mockImplementation(() => { throw new Error('Not found'); });
    expect(getContainerStatus('sql1')).toBeNull();
  });

  it('startContainer should call docker start', () => {
    startContainer('sql1');
    expect(child_process.execSync).toHaveBeenCalledWith('docker start sql1');
  });

  it('runNewContainer should call docker run with correct arguments', () => {
    runNewContainer('sql1', 'pass123', 1433);
    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining('docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=pass123" -p 1433:1433')
    );
  });
});
