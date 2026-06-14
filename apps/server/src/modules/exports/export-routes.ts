import type {FastifyInstance} from 'fastify';
import type {ServerConfig} from '../../config';
import {data} from '../../lib/api-response';
import {ProjectStore} from '../projects/project-store';
import {exportProject} from './export-service';

export async function registerExportRoutes(app: FastifyInstance, config: ServerConfig): Promise<void> {
  const store = new ProjectStore(config.workspaceDir);
  app.post('/api/v1/exports', async () => {
    const project = await store.load();
    return data(await exportProject({project, outputDir: config.outputDir, workspaceDir: config.workspaceDir}));
  });
}
