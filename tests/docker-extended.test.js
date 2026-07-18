import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyFilesToContainer, cleanupFiles } from '../docker.js';
import child_process from 'child_process';
import EventEmitter from 'events';
import tar from 'tar-fs';

vi.mock('child_process');
vi.mock('tar-fs');
vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('docker extended', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('copyFilesToContainer should resolve on success', async () => {
    const mockSpawn = new EventEmitter();
    mockSpawn.stderr = new EventEmitter();
    mockSpawn.stdin = new EventEmitter();

    child_process.spawn.mockReturnValue(mockSpawn);

    const mockTarStream = new EventEmitter();
    mockTarStream.pipe = vi.fn();
    tar.pack.mockReturnValue(mockTarStream);

    const promise = copyFilesToContainer('sql1', ['test.mdf'], '/var');

    // Simulate process exiting successfully
    mockSpawn.emit('close', 0);

    await expect(promise).resolves.toBeUndefined();
    expect(child_process.execSync).toHaveBeenCalledWith(expect.stringContaining('chown 10001:0'));
  });

  it('copyFilesToContainer should reject on failure', async () => {
    const mockSpawn = new EventEmitter();
    mockSpawn.stderr = new EventEmitter();
    mockSpawn.stdin = new EventEmitter();

    child_process.spawn.mockReturnValue(mockSpawn);

    const mockTarStream = new EventEmitter();
    mockTarStream.pipe = vi.fn();
    tar.pack.mockReturnValue(mockTarStream);

    const promise = copyFilesToContainer('sql1', ['test.mdf'], '/var');

    // Simulate process failure
    mockSpawn.emit('close', 1);

    await expect(promise).rejects.toThrow('docker tar process exited with code 1');
  });

  it('cleanupFiles should execute rm command', () => {
    cleanupFiles('sql1', ['file1'], '/var');
    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining('rm -f "/var/file1"')
    );
  });
});
