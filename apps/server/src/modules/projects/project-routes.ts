import fs from 'node:fs/promises';
import path from 'node:path';
import type {FastifyInstance} from 'fastify';
import {defaultThemeConfig, ExportConfigPatchSchema, ExportConfigSchema, ThemeConfigPatchSchema, ThemeConfigSchema} from '@playlist2video/shared';
import {z} from 'zod';
import type {ServerConfig} from '../../config';
import {data} from '../../lib/api-response';
import {AppError} from '../../lib/errors';
import {assertSafeLocalPath} from '../../lib/path-safety';
import {scanFolder} from '../audio/scan-folder';
import {hydrateProjectMediaUrls, resolveProjectMediaPath} from './project-media';
import {ProjectStore} from './project-store';

const scanRequestSchema = z.object({folderPath: z.string().min(1)});
const reorderRequestSchema = z.object({trackIds: z.array(z.string().min(1))});
const updateTrackSchema = z.object({trackId: z.string().min(1), title: z.string().min(1).max(200), artist: z.string().min(1).max(200)});
const updateSettingsSchema = z.object({
  theme: ThemeConfigPatchSchema.optional(),
  exportConfig: ExportConfigPatchSchema.optional(),
});
const mediaParamsSchema = z.object({trackId: z.string().min(1), kind: z.enum(['audio', 'cover'])});

const contentTypes: Record<string, string> = {
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
};

function parseRangeHeader(rangeHeader: string | undefined, fileSize: number): {start: number; end: number} | null {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;

  const [, startText, endText] = match;
  if (!startText && !endText) return null;

  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
    const start = Math.max(0, fileSize - suffixLength);
    return {start, end: fileSize - 1};
  }

  const start = Number(startText);
  const end = endText ? Number(endText) : fileSize - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= fileSize) return null;
  return {start, end: Math.min(end, fileSize - 1)};
}

async function readFileRange(filePath: string, range: {start: number; end: number}): Promise<Buffer> {
  const file = await fs.open(filePath, 'r');
  try {
    const length = range.end - range.start + 1;
    const buffer = Buffer.alloc(length);
    await file.read(buffer, 0, length, range.start);
    return buffer;
  } finally {
    await file.close();
  }
}

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
    return data({project: hydrateProjectMediaUrls(project), warnings: result.warnings});
  });

  app.get('/api/v1/projects/current', async () => data(hydrateProjectMediaUrls(await store.load())));

  app.get('/api/v1/projects/current/media/:trackId/:kind', async (request, reply) => {
    const params = mediaParamsSchema.parse(request.params);
    const project = await store.load();
    const mediaPath = resolveProjectMediaPath(project, params.trackId, params.kind);
    if (!mediaPath) throw new AppError('media_not_found', 'Media file was not found in the current project', 404);
    const contentType = contentTypes[path.extname(mediaPath).toLowerCase()] ?? 'application/octet-stream';
    const fileSize = (await fs.stat(mediaPath)).size;
    const range = parseRangeHeader(request.headers.range, fileSize);
    reply.header('Content-Type', contentType);
    reply.header('Accept-Ranges', 'bytes');
    if (range) {
      const chunk = await readFileRange(mediaPath, range);
      reply.status(206);
      reply.header('Content-Range', `bytes ${range.start}-${range.end}/${fileSize}`);
      reply.header('Content-Length', String(chunk.length));
      return reply.send(chunk);
    }
    reply.header('Content-Length', String(fileSize));
    return reply.send(await fs.readFile(mediaPath));
  });

  app.patch('/api/v1/projects/current/reorder', async (request) => {
    const body = reorderRequestSchema.parse(request.body);
    const project = await store.load();
    const byId = new Map(project.tracks.map((track) => [track.id, track]));
    if (body.trackIds.length !== project.tracks.length || body.trackIds.some((id) => !byId.has(id))) {
      throw new AppError('invalid_track_order', 'Track order must contain every current track exactly once', 422);
    }
    return data(hydrateProjectMediaUrls(await store.save({...project, tracks: body.trackIds.map((id, order) => ({...byId.get(id)!, order}))})));
  });

  app.patch('/api/v1/projects/current/tracks', async (request) => {
    const body = updateTrackSchema.parse(request.body);
    const project = await store.load();
    const tracks = project.tracks.map((track) => track.id === body.trackId ? {...track, title: body.title, artist: body.artist} : track);
    return data(hydrateProjectMediaUrls(await store.save({...project, tracks})));
  });

  app.patch('/api/v1/projects/current/settings', async (request) => {
    const body = updateSettingsSchema.parse(request.body);
    const project = await store.load();
    const theme = ThemeConfigSchema.parse({...project.theme, ...body.theme});
    const exportConfig = ExportConfigSchema.parse({...project.exportConfig, ...body.exportConfig});
    return data(hydrateProjectMediaUrls(await store.save({...project, theme, exportConfig})));
  });
}
