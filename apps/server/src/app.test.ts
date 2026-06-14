import {describe, expect, it} from 'vitest';
import {buildApp} from './app';
import type {ServerConfig} from './config';

const config: ServerConfig = {
  host: '127.0.0.1',
  port: 0,
  workspaceDir: process.cwd(),
  assetsDir: `${process.cwd()}/assets`,
  outputDir: `${process.cwd()}/output`,
};

describe('app', () => {
  it('returns health', async () => {
    const app = await buildApp(config);
    const response = await app.inject({method: 'GET', url: '/api/v1/health'});
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({data: {ok: true}});
    await app.close();
  });

  it('validates scan body', async () => {
    const app = await buildApp(config);
    const response = await app.inject({method: 'POST', url: '/api/v1/projects/scan', payload: {folderPath: ''}});
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('validation_error');
    await app.close();
  });
});
