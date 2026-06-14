import path from 'node:path';

export interface ServerConfig {
  host: string;
  port: number;
  workspaceDir: string;
  assetsDir: string;
  outputDir: string;
}

export function loadConfig(): ServerConfig {
  const workspaceDir = path.resolve(process.env.PLAYLIST2VIDEO_WORKSPACE ?? process.cwd());
  return {
    host: process.env.HOST ?? '127.0.0.1',
    port: Number(process.env.PORT ?? 4317),
    workspaceDir,
    assetsDir: path.join(workspaceDir, 'assets'),
    outputDir: path.join(workspaceDir, 'output'),
  };
}
