import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitForSqlServer, attachDatabase } from '../sqlserver.js';
import sql from 'mssql';

vi.mock('mssql');
vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

describe('sqlserver', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('waitForSqlServer should resolve when connection succeeds', async () => {
    const mockPool = { close: vi.fn() };
    sql.connect.mockResolvedValue(mockPool);

    await expect(waitForSqlServer({ waitTimeout: 5 })).resolves.toBeUndefined();
    expect(sql.connect).toHaveBeenCalled();
    expect(mockPool.close).toHaveBeenCalled();
  });

  it('attachDatabase should execute CREATE DATABASE FOR ATTACH', async () => {
    const mockRequest = {
      query: vi.fn().mockResolvedValue({ recordset: [] }),
      input: vi.fn().mockReturnThis()
    };
    const mockPool = {
      request: vi.fn().mockReturnValue(mockRequest),
      close: vi.fn()
    };
    sql.connect.mockResolvedValue(mockPool);

    await attachDatabase({}, 'mydb', 'path/to/mdf', 'path/to/ldf');

    expect(mockRequest.query).toHaveBeenCalledWith(expect.stringContaining('CREATE DATABASE [mydb]'));
    expect(mockRequest.query).toHaveBeenCalledWith(expect.stringContaining('FOR ATTACH'));
    expect(mockPool.close).toHaveBeenCalled();
  });

  it('attachDatabase should replace DB if option is set', async () => {
    const mockRequest = {
      query: vi.fn()
        .mockResolvedValueOnce({ recordset: [{ name: 'mydb' }] }) // SELECT query
        .mockResolvedValueOnce({}) // ALTER/DROP query
        .mockResolvedValueOnce({}), // CREATE query
      input: vi.fn().mockReturnThis()
    };
    const mockPool = {
      request: vi.fn().mockReturnValue(mockRequest),
      close: vi.fn()
    };
    sql.connect.mockResolvedValue(mockPool);

    await attachDatabase({ replace: true }, 'mydb', 'path/to/mdf', 'path/to/ldf');

    expect(mockRequest.query).toHaveBeenCalledWith(expect.stringContaining('DROP DATABASE [mydb]'));
    expect(mockRequest.query).toHaveBeenCalledWith(expect.stringContaining('CREATE DATABASE [mydb]'));
  });
});
