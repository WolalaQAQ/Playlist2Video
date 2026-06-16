import type {FastifyInstance} from 'fastify';
import {ProjectSchema} from '@playlist2video/shared';
import {z} from 'zod';
import type {ServerConfig} from '../../config';
import {data} from '../../lib/api-response';
import {ProjectStore} from '../projects/project-store';
import {exportProject} from './export-service';

const exportRequestSchema = z.object({
  project: ProjectSchema.optional(),
}).optional();

export async function registerExportRoutes(app: FastifyInstance, config: ServerConfig): Promise<void> {
  const store = new ProjectStore(config.workspaceDir);
  app.post('/api/v1/exports', async (request) => {
    const body = exportRequestSchema.parse(request.body ?? {});
    const project = body?.project ?? await store.load();
    return data(await exportProject({project, outputDir: config.outputDir, workspaceDir: config.workspaceDir}));
  });
}
