import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from '../config.js';
import fs from 'fs';

vi.mock('fs');
vi.mock('../logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  }
}));

describe('config', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should load defaults when no config file and no cli args', () => {
    fs.existsSync.mockReturnValue(false);
    
    // Minimal valid CLI args to pass zod schema
    const config = loadConfig({ password: 'test' }, 'notfound.yml');
    
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(1433);
    expect(config.user).toBe('sa');
    expect(config.parallel).toBe(1);
    expect(config.password).toBe('test');
  });

  it('should load config from yaml and merge', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(`
      host: yamlhost
      port: 1434
      password: mypass
    `);

    const config = loadConfig({ parallel: 5 }, 'found.yml');
    
    expect(config.host).toBe('yamlhost');
    expect(config.port).toBe(1434);
    expect(config.parallel).toBe(5); // from CLI
    expect(config.password).toBe('mypass'); // from yaml
  });

  it('should throw on invalid config', () => {
    fs.existsSync.mockReturnValue(false);
    
    expect(() => {
      // missing password
      loadConfig({}, 'notfound.yml');
    }).toThrow('Invalid configuration');
  });
  
  it('should throw on malformed yaml', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation(() => { throw new Error('yaml parse error'); });
    
    expect(() => {
      loadConfig({ password: 'test' }, 'found.yml');
    }).toThrow('Failed to parse config file');
  });
});
