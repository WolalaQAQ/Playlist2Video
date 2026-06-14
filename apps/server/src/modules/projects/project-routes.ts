import path from 'node:path';
import type {FastifyInstance} from 'fastify';
import {defaultThemeConfig, ExportConfigSchema} from '@playlist2video/shared';
import {z} from 'zod';
import type {ServerConfig} from '../../config';
import {data} from '../../lib/api-response';
import {AppError} from '../../lib/errors';
import {assertSafeLocalPath} from '../../lib/path-safety';
import {scanFolder} from '../audio/scan-folder';
import {ProjectStore} from './project-store';

const scanRequestSchema = z.object({folderPath: z.string().min(1)});
const reorderRequestSchema = z.object({trackIds: z.array(z.string().min(1))});
const updateTrackSchema = z.object({trackId: z.string().min(1), title: z.string().min(1).max(200), artist: z.string().min(1).max(200)});

export async function registerProjectRoutes(app: FastifyInstance, config: ServerConfig): Promise<void> {
  const store = new ProjectStore(config.workspaceDir);

  app.post('/api/v1/projects/scan', async (request) => {
    const body = scanRequestSchema.parse(request.body);
    const folderPath = assertSafeLocalPath(body.folderPath);
    const result = await scanFolder({folderPath, assetsDir: config.assetsDir});
    if (result.tracks.length === 0) throw new AppError('no_audio_files', 'No supported audio files were found in this folder', 422, result.warnings);
    const project = await store.save({
      name: path.basename(folderPath) || 'Playlist Video',
      sourceFolder: folderPath,
      tracks: result.tracks,
      theme: defaultThemeConfig,
      exportConfig: ExportConfigSchema.parse({}),
    });
    return data({project, warnings: result.warnings});
  });

  app.get('/api/v1/projects/current', async () => data(await store.load()));

  app.patch('/api/v1/projects/current/reorder', async (request) => {
    const body = reorderRequestSchema.parse(request.body);
    const project = await store.load();
    const byId = new Map(project.tracks.map((track) => [track.id, track]));
    if (body.trackIds.length !== project.tracks.length || body.trackIds.some((id) => !byId.has(id))) {
      throw new AppError('invalid_track_order', 'Track order must contain every current track exactly once', 422);
    }
    return data(await store.save({...project, tracks: body.trackIds.map((id, order) => ({...byId.get(id)!, order}))}));
  });

  app.patch('/api/v1/projects/current/tracks', async (request) => {
    const body = updateTrackSchema.parse(request.body);
    const project = await store.load();
    const tracks = project.tracks.map((track) => track.id === body.trackId ? {...track, title: body.title, artist: body.artist} : track);
    return data(await store.save({...project, tracks}));
  });
}
