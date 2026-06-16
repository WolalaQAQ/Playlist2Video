import type {FastifyInstance} from 'fastify';
import {ProjectSchema, type Project} from '@playlist2video/shared';
import {z} from 'zod';
import type {ServerConfig} from '../../config';
import {data} from '../../lib/api-response';
import {ProjectStore} from '../projects/project-store';
import {exportProject} from './export-service';
import {exportProjectStills} from './still-export-service';

const exportRequestSchema = z.object({
  project: ProjectSchema.optional(),
}).optional();

// The web client strips heavy spectrumFrames before posting to keep the request body small.
// spectrumFrames is deterministic, audio-derived data persisted at scan time, so we restore it
// from the saved project by track id without overriding any edits carried in the snapshot.
async function rehydrateSpectrumFrames(project: Project, store: ProjectStore): Promise<Project> {
  if (project.tracks.every((track) => track.spectrumFrames !== undefined)) return project;
  const saved = await store.load().catch(() => null);
  if (!saved) return project;
  const savedFramesById = new Map(saved.tracks.map((track) => [track.id, track.spectrumFrames]));
  return {
    ...project,
    tracks: project.tracks.map((track) =>
      track.spectrumFrames !== undefined ? track : {...track, spectrumFrames: savedFramesById.get(track.id)},
    ),
  };
}

export async function registerExportRoutes(app: FastifyInstance, config: ServerConfig): Promise<void> {
  const store = new ProjectStore(config.workspaceDir);
  app.post('/api/v1/exports', async (request) => {
    const body = exportRequestSchema.parse(request.body ?? {});
    const project = body?.project ? await rehydrateSpectrumFrames(body.project, store) : await store.load();
    return data(await exportProject({project, outputDir: config.outputDir, workspaceDir: config.workspaceDir}));
  });

  app.post('/api/v1/exports/stills', async (request) => {
    const body = exportRequestSchema.parse(request.body ?? {});
    const project = body?.project ? await rehydrateSpectrumFrames(body.project, store) : await store.load();
    return data(await exportProjectStills({project, outputDir: config.outputDir, workspaceDir: config.workspaceDir}));
  });
}
