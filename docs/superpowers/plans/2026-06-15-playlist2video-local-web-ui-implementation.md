# Playlist2Video Local Web UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local localhost Web UI that scans a folder of audio files, previews one Remotion playlist video theme, and exports a 1080p MP4.

**Architecture:** Use an npm-workspaces TypeScript monorepo with shared schemas, a Fastify local API server, a Vite React frontend, and a Remotion video-template package. The MVP implements only `playlist-v4`, but keeps a theme registry so later themes can be added without changing the app shape.

**Tech Stack:** Node.js 24, npm workspaces, TypeScript, Vitest, Fastify, Zod, React, Vite, Remotion, `@remotion/player`, `@remotion/renderer`, `@remotion/media-utils`, `music-metadata`, `sharp`, FFmpeg.

---

## File Structure

```text
package.json
tsconfig.base.json
vitest.config.ts
README.md
CHANGELOG.md

apps/server/src
  app.ts
  index.ts
  config.ts
  lib/api-response.ts
  lib/errors.ts
  lib/path-safety.ts
  modules/audio/audio-file.ts
  modules/audio/metadata.ts
  modules/audio/scan-folder.ts
  modules/assets/cover-assets.ts
  modules/projects/project-store.ts
  modules/projects/project-routes.ts
  modules/exports/export-service.ts
  modules/exports/export-routes.ts

apps/web/src
  main.tsx
  App.tsx
  styles.css
  api/client.ts
  state/project-store.ts
  components/FolderImporter.tsx
  components/PlaylistEditor.tsx
  components/ThemePanel.tsx
  components/VideoPreview.tsx
  components/ExportPanel.tsx

packages/shared/src
  index.ts
  schemas.ts
  theme.ts
  timeline.ts

packages/video-template/src
  index.ts
  Root.tsx
  PlaylistVideo.tsx
  themes/registry.ts
  themes/playlist-v4/PlaylistV4Theme.tsx
  themes/playlist-v4/PlaylistPanel.tsx
  themes/playlist-v4/Waveform.tsx
  themes/playlist-v4/BeatEffects.tsx
  themes/playlist-v4/theme.css
```

Boundary rules:

- `packages/shared`: schemas, types, pure timeline/theme helpers only.
- `packages/video-template`: Remotion components only; imports shared types.
- `apps/server`: local filesystem, metadata, project persistence, export orchestration, API routes.
- `apps/web`: UI state, API calls, playlist editing, preview, export controls.

---

## Task 1: Initialize Workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `README.md`
- Create: `CHANGELOG.md`
- Modify: `.gitignore`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "playlist2video",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "npm-run-all --parallel dev:server dev:web",
    "dev:server": "npm --workspace apps/server run dev",
    "dev:web": "npm --workspace apps/web run dev",
    "build": "npm run build --workspaces",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b --pretty false",
    "verify": "npm run typecheck && npm test",
    "verify:audit": "npm audit --audit-level=moderate",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "jsdom": "latest",
    "npm-run-all": "latest",
    "prettier": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Create root TypeScript config**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@playlist2video/shared": ["packages/shared/src/index.ts"],
      "@playlist2video/video-template": ["packages/video-template/src/index.ts"]
    }
  }
}
```

- [ ] **Step 3: Create Vitest config**

Create `vitest.config.ts`:

```ts
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/**/*.test.ts', 'apps/**/*.test.tsx', 'packages/**/*.test.ts', 'packages/**/*.test.tsx'],
    setupFiles: ['apps/web/src/test/setup.ts'],
  },
});
```

- [ ] **Step 4: Create initial docs**

Create `README.md`:

```md
# Playlist2Video

Local Web UI for turning a folder of audio files into a playlist video.

## Development

```bash
npm install
npm run dev
```

Server: `http://127.0.0.1:4317`  
Web UI: `http://127.0.0.1:5173`
```

Create `CHANGELOG.md`:

```md
# Changelog

## [0.1.0] - 2026-06-15
### Features
- Planned local Web UI for converting an audio folder into a playlist video.
- Planned Remotion `playlist-v4` theme with full playlist panel, waveform, and beat-reactive effects.

### Design Rationale
- Use TypeScript across UI, server, shared contracts, and Remotion rendering.
- Ship one polished theme while reserving a theme registry for future themes.

### Notes & Caveats
- MVP is local-only and requires FFmpeg for export.
```

- [ ] **Step 5: Update `.gitignore`**

```gitignore
node_modules/
dist/
build/
coverage/
.env
.env.*
!.env.example
.superpowers/
output/
assets/
.tmp/
*.log
.DS_Store
```

- [ ] **Step 6: Install and commit**

Run:

```bash
npm install
npm run typecheck
git add package.json package-lock.json tsconfig.base.json vitest.config.ts README.md CHANGELOG.md .gitignore
git commit -m "chore: initialize TypeScript workspace"
```

Expected: `npm install` succeeds; `typecheck` may pass with no source projects or report no inputs. If it fails because referenced app packages do not exist yet, continue to Task 2 and rerun after package configs exist.

---

## Task 2: Shared Schemas, Timeline, and Theme Types

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/schemas.ts`
- Create: `packages/shared/src/timeline.ts`
- Create: `packages/shared/src/theme.ts`
- Test: `packages/shared/src/timeline.test.ts`
- Test: `packages/shared/src/theme.test.ts`

- [ ] **Step 1: Create shared package files**

Create `packages/shared/package.json`:

```json
{
  "name": "@playlist2video/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "zod": "latest"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Write failing tests**

Create `packages/shared/src/timeline.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {buildTimeline, findTrackAtTime, getTotalDuration} from './timeline';
import type {Track} from './schemas';

const tracks: Track[] = [
  {id: 'track-1', sourcePath: 'C:/Music/01.mp3', title: 'Intro', artist: 'A', album: null, durationSeconds: 10, coverPath: null, order: 0},
  {id: 'track-2', sourcePath: 'C:/Music/02.mp3', title: 'Main', artist: 'B', album: 'Album', durationSeconds: 20, coverPath: 'assets/2.jpg', order: 1},
];

describe('timeline', () => {
  it('builds start and end times', () => {
    expect(buildTimeline(tracks)).toEqual([
      {...tracks[0], startSeconds: 0, endSeconds: 10},
      {...tracks[1], startSeconds: 10, endSeconds: 30},
    ]);
  });

  it('finds current track by time', () => {
    const timeline = buildTimeline(tracks);
    expect(findTrackAtTime(timeline, 0)?.id).toBe('track-1');
    expect(findTrackAtTime(timeline, 9.99)?.id).toBe('track-1');
    expect(findTrackAtTime(timeline, 10)?.id).toBe('track-2');
    expect(findTrackAtTime(timeline, 30)?.id).toBe('track-2');
  });

  it('gets total duration', () => {
    expect(getTotalDuration(buildTimeline(tracks))).toBe(30);
  });
});
```

Create `packages/shared/src/theme.test.ts`:

```ts
import {expect, it} from 'vitest';
import {defaultThemeConfig, themeOptions} from './theme';

it('exposes only playlist-v4 for MVP', () => {
  expect(themeOptions).toEqual([
    {id: 'playlist-v4', name: 'Playlist V4', description: 'YouTube-style playlist layout with waveform and beat-reactive effects'},
  ]);
});

it('uses playlist-v4 defaults', () => {
  expect(defaultThemeConfig).toEqual({
    themeId: 'playlist-v4',
    effectIntensity: 'high',
    showParticles: true,
    showPulseRings: true,
    playlistPanelMode: 'full',
  });
});
```

Run:

```bash
npm test -- packages/shared/src
```

Expected: FAIL because implementation files are missing.

- [ ] **Step 3: Implement shared contracts**

Create `packages/shared/src/schemas.ts`:

```ts
import {z} from 'zod';

export const supportedAudioExtensions = ['.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg'] as const;

export const TrackSchema = z.object({
  id: z.string().min(1),
  sourcePath: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().nullable(),
  durationSeconds: z.number().positive(),
  coverPath: z.string().nullable(),
  order: z.number().int().nonnegative(),
});

export const TimelineTrackSchema = TrackSchema.extend({
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
});

export const ThemeConfigSchema = z.object({
  themeId: z.literal('playlist-v4'),
  accentColor: z.string().optional(),
  effectIntensity: z.enum(['low', 'medium', 'high']).default('high'),
  showParticles: z.boolean().default(true),
  showPulseRings: z.boolean().default(true),
  playlistPanelMode: z.literal('full').default('full'),
});

export const ExportConfigSchema = z.object({
  width: z.number().int().positive().default(1920),
  height: z.number().int().positive().default(1080),
  fps: z.number().int().positive().default(30),
  videoCodec: z.literal('h264').default('h264'),
  outputFileName: z.string().min(1).default('playlist-video.mp4'),
});

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceFolder: z.string().min(1),
  tracks: z.array(TrackSchema),
  theme: ThemeConfigSchema,
  exportConfig: ExportConfigSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Track = z.infer<typeof TrackSchema>;
export type TimelineTrack = z.infer<typeof TimelineTrackSchema>;
export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;
export type ExportConfig = z.infer<typeof ExportConfigSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type SupportedAudioExtension = (typeof supportedAudioExtensions)[number];
```

Create `packages/shared/src/timeline.ts`:

```ts
import type {TimelineTrack, Track} from './schemas';

export function buildTimeline(tracks: Track[]): TimelineTrack[] {
  const ordered = [...tracks].sort((a, b) => a.order - b.order);
  let cursor = 0;
  return ordered.map((track) => {
    const startSeconds = cursor;
    const endSeconds = startSeconds + track.durationSeconds;
    cursor = endSeconds;
    return {...track, startSeconds, endSeconds};
  });
}

export function findTrackAtTime(timeline: TimelineTrack[], timeSeconds: number): TimelineTrack | null {
  if (timeline.length === 0) return null;
  return timeline.find((track) => timeSeconds >= track.startSeconds && timeSeconds < track.endSeconds) ?? timeline[timeline.length - 1];
}

export function getTotalDuration(timeline: TimelineTrack[]): number {
  return timeline.at(-1)?.endSeconds ?? 0;
}
```

Create `packages/shared/src/theme.ts`:

```ts
import type {ThemeConfig} from './schemas';

export type ThemeId = 'playlist-v4';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
}

export const themeOptions: ThemeOption[] = [
  {id: 'playlist-v4', name: 'Playlist V4', description: 'YouTube-style playlist layout with waveform and beat-reactive effects'},
];

export const defaultThemeConfig: ThemeConfig = {
  themeId: 'playlist-v4',
  effectIntensity: 'high',
  showParticles: true,
  showPulseRings: true,
  playlistPanelMode: 'full',
};
```

Create `packages/shared/src/index.ts`:

```ts
export * from './schemas';
export * from './theme';
export * from './timeline';
```

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm test -- packages/shared/src
git add packages/shared package.json package-lock.json
git commit -m "feat: add shared playlist contracts"
```

Expected: PASS.

---

## Task 3: Server Scanner, Metadata, and Project API

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/src/config.ts`
- Create: `apps/server/src/app.ts`
- Create: `apps/server/src/index.ts`
- Create: `apps/server/src/lib/api-response.ts`
- Create: `apps/server/src/lib/errors.ts`
- Create: `apps/server/src/lib/path-safety.ts`
- Create: `apps/server/src/modules/audio/audio-file.ts`
- Create: `apps/server/src/modules/audio/metadata.ts`
- Create: `apps/server/src/modules/audio/scan-folder.ts`
- Create: `apps/server/src/modules/assets/cover-assets.ts`
- Create: `apps/server/src/modules/projects/project-store.ts`
- Create: `apps/server/src/modules/projects/project-routes.ts`
- Test: `apps/server/src/**/*.test.ts`

- [ ] **Step 1: Add server package**

Create `apps/server/package.json`:

```json
{
  "name": "@playlist2video/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run src"
  },
  "dependencies": {
    "@fastify/cors": "latest",
    "@playlist2video/shared": "0.1.0",
    "fastify": "latest",
    "music-metadata": "latest",
    "sharp": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "tsx": "latest"
  }
}
```

Create `apps/server/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "noEmit": false
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Add server unit tests first**

Create `apps/server/src/modules/audio/audio-file.test.ts`:

```ts
import {expect, it} from 'vitest';
import {deriveTitleFromFileName, isSupportedAudioFile} from './audio-file';

it.each(['song.mp3', 'song.FLAC', 'song.wav', 'song.m4a', 'song.aac', 'song.ogg'])('accepts %s', (fileName) => {
  expect(isSupportedAudioFile(fileName)).toBe(true);
});

it.each(['cover.jpg', 'notes.txt', 'video.mp4', 'song.mp3.tmp'])('rejects %s', (fileName) => {
  expect(isSupportedAudioFile(fileName)).toBe(false);
});

it('derives title from filename', () => {
  expect(deriveTitleFromFileName('01 - midnight_drive.mp3')).toBe('01 - midnight drive');
});
```

Create `apps/server/src/lib/path-safety.test.ts`:

```ts
import path from 'node:path';
import {expect, it} from 'vitest';
import {assertSafeLocalPath, resolveInside} from './path-safety';

it('rejects empty paths', () => {
  expect(() => assertSafeLocalPath('')).toThrow('Path is required');
});

it('rejects null bytes', () => {
  expect(() => assertSafeLocalPath('C:/Music\0evil')).toThrow('Path contains invalid characters');
});

it('keeps output paths inside a root', () => {
  const root = path.resolve('output');
  expect(resolveInside(root, 'video.mp4')).toBe(path.join(root, 'video.mp4'));
  expect(() => resolveInside(root, '../escape.mp4')).toThrow('Resolved path escapes project root');
});
```

Create `apps/server/src/modules/projects/project-store.test.ts`:

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {expect, it} from 'vitest';
import {defaultThemeConfig} from '@playlist2video/shared';
import {ProjectStore} from './project-store';

it('saves and loads the current project', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'p2v-store-'));
  const store = new ProjectStore(root);
  const project = await store.save({
    name: 'Test',
    sourceFolder: 'C:/Music',
    tracks: [],
    theme: defaultThemeConfig,
    exportConfig: {width: 1920, height: 1080, fps: 30, videoCodec: 'h264', outputFileName: 'playlist-video.mp4'},
  });
  expect(await store.load()).toEqual(project);
});
```

Run:

```bash
npm test -- apps/server/src
```

Expected: FAIL because implementation files are missing.

- [ ] **Step 3: Implement server libraries**

Create `apps/server/src/lib/api-response.ts`:

```ts
export interface ApiSuccess<T> { data: T }
export interface ApiErrorResponse { error: {code: string; message: string; details?: unknown} }
export const data = <T>(value: T): ApiSuccess<T> => ({data: value});
export const errorResponse = (code: string, message: string, details?: unknown): ApiErrorResponse => ({error: {code, message, details}});
```

Create `apps/server/src/lib/errors.ts`:

```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}
```

Create `apps/server/src/lib/path-safety.ts`:

```ts
import path from 'node:path';

export function assertSafeLocalPath(inputPath: string): string {
  if (inputPath.trim().length === 0) throw new Error('Path is required');
  if (inputPath.includes('\0')) throw new Error('Path contains invalid characters');
  return path.resolve(inputPath);
}

export function resolveInside(root: string, childPath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedChild = path.resolve(resolvedRoot, childPath);
  const relative = path.relative(resolvedRoot, resolvedChild);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Resolved path escapes project root');
  return resolvedChild;
}
```

Create `apps/server/src/config.ts`:

```ts
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
```

- [ ] **Step 4: Implement scanning and metadata**

Create `apps/server/src/modules/audio/audio-file.ts`:

```ts
import path from 'node:path';
import {supportedAudioExtensions} from '@playlist2video/shared';

export function isSupportedAudioFile(filePath: string): boolean {
  return supportedAudioExtensions.includes(path.extname(filePath).toLowerCase() as (typeof supportedAudioExtensions)[number]);
}

export function deriveTitleFromFileName(filePath: string): string {
  return path.parse(filePath).name.replaceAll('_', ' ').trim();
}
```

Create `apps/server/src/modules/audio/metadata.ts`:

```ts
import crypto from 'node:crypto';
import {parseFile, type IAudioMetadata} from 'music-metadata';
import type {Track} from '@playlist2video/shared';
import {deriveTitleFromFileName} from './audio-file';

export async function readAudioMetadata(filePath: string): Promise<IAudioMetadata> {
  return parseFile(filePath, {duration: true});
}

export function buildTrackFromMetadata(input: {
  filePath: string;
  order: number;
  durationSeconds: number;
  metadata: Pick<IAudioMetadata, 'common' | 'format'>;
  coverPath: string | null;
}): Track {
  return {
    id: `track-${crypto.createHash('sha1').update(input.filePath).digest('hex').slice(0, 12)}`,
    sourcePath: input.filePath,
    title: input.metadata.common.title?.trim() || deriveTitleFromFileName(input.filePath),
    artist: input.metadata.common.artist?.trim() || 'Unknown Artist',
    album: input.metadata.common.album?.trim() || null,
    durationSeconds: input.durationSeconds,
    coverPath: input.coverPath,
    order: input.order,
  };
}
```

Create `apps/server/src/modules/assets/cover-assets.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type {IAudioMetadata} from 'music-metadata';

export async function writeCoverAsset(options: {metadata: IAudioMetadata; assetsDir: string; trackId: string}): Promise<string | null> {
  const picture = options.metadata.common.picture?.[0];
  if (!picture) return null;
  await fs.mkdir(options.assetsDir, {recursive: true});
  const outputPath = path.join(options.assetsDir, `${options.trackId}.jpg`);
  await sharp(picture.data).resize(900, 900, {fit: 'cover'}).jpeg({quality: 90}).toFile(outputPath);
  return outputPath;
}

export async function writeFallbackCover(options: {assetsDir: string; trackId: string; title: string}): Promise<string> {
  await fs.mkdir(options.assetsDir, {recursive: true});
  const outputPath = path.join(options.assetsDir, `${options.trackId}-fallback.jpg`);
  const letter = options.title.trim().charAt(0).toUpperCase() || '♪';
  const svg = `<svg width="900" height="900" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="0.5" stop-color="#f97316"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="900" height="900" rx="72" fill="url(#g)"/><text x="450" y="535" font-size="260" font-family="Arial" font-weight="800" text-anchor="middle" fill="white">${letter}</text></svg>`;
  await sharp(Buffer.from(svg)).jpeg({quality: 90}).toFile(outputPath);
  return outputPath;
}
```

Create `apps/server/src/modules/audio/scan-folder.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import type {Track} from '@playlist2video/shared';
import {writeCoverAsset, writeFallbackCover} from '../assets/cover-assets';
import {isSupportedAudioFile} from './audio-file';
import {buildTrackFromMetadata, readAudioMetadata} from './metadata';

export interface ScanFolderResult {
  tracks: Track[];
  warnings: string[];
}

export async function scanFolder(options: {folderPath: string; assetsDir: string}): Promise<ScanFolderResult> {
  const entries = await fs.readdir(options.folderPath, {withFileTypes: true});
  const filePaths = entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(options.folderPath, entry.name))
    .filter(isSupportedAudioFile)
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b), undefined, {numeric: true}));

  const tracks: Track[] = [];
  const warnings: string[] = [];

  for (const [order, filePath] of filePaths.entries()) {
    try {
      const metadata = await readAudioMetadata(filePath);
      const durationSeconds = metadata.format.duration;
      if (!durationSeconds || durationSeconds <= 0) {
        warnings.push(`Skipped ${filePath}: missing duration`);
        continue;
      }
      const base = buildTrackFromMetadata({filePath, order, durationSeconds, metadata, coverPath: null});
      const coverPath = (await writeCoverAsset({metadata, assetsDir: options.assetsDir, trackId: base.id})) ??
        (await writeFallbackCover({assetsDir: options.assetsDir, trackId: base.id, title: base.title}));
      tracks.push({...base, coverPath});
    } catch (error) {
      warnings.push(`Skipped ${filePath}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  return {tracks, warnings};
}
```

- [ ] **Step 5: Implement project store and routes**

Create `apps/server/src/modules/projects/project-store.ts`:

```ts
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {ProjectSchema, type ExportConfig, type Project, type ThemeConfig, type Track} from '@playlist2video/shared';

export interface SaveProjectInput {
  name: string;
  sourceFolder: string;
  tracks: Track[];
  theme: ThemeConfig;
  exportConfig: ExportConfig;
}

export class ProjectStore {
  private readonly projectPath: string;
  constructor(private readonly rootDir: string) {
    this.projectPath = path.join(rootDir, 'project.json');
  }

  async save(input: SaveProjectInput): Promise<Project> {
    await fs.mkdir(this.rootDir, {recursive: true});
    const now = new Date().toISOString();
    const existing = await this.load().catch(() => null);
    const project: Project = {
      id: existing?.id ?? `project-${crypto.randomUUID()}`,
      name: input.name,
      sourceFolder: input.sourceFolder,
      tracks: input.tracks,
      theme: input.theme,
      exportConfig: input.exportConfig,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await fs.writeFile(this.projectPath, JSON.stringify(project, null, 2), 'utf8');
    return project;
  }

  async load(): Promise<Project> {
    return ProjectSchema.parse(JSON.parse(await fs.readFile(this.projectPath, 'utf8')));
  }
}
```

Create `apps/server/src/modules/projects/project-routes.ts`:

```ts
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
```

- [ ] **Step 6: Implement Fastify app**

Create `apps/server/src/app.ts`:

```ts
import cors from '@fastify/cors';
import Fastify from 'fastify';
import {ZodError} from 'zod';
import type {ServerConfig} from './config';
import {data, errorResponse} from './lib/api-response';
import {AppError} from './lib/errors';
import {registerProjectRoutes} from './modules/projects/project-routes';

export async function buildApp(config: ServerConfig) {
  const app = Fastify({logger: true});
  await app.register(cors, {origin: ['http://localhost:5173', 'http://127.0.0.1:5173']});
  app.get('/api/v1/health', async () => data({ok: true}));
  await registerProjectRoutes(app, config);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) return reply.status(422).send(errorResponse('validation_error', 'Request validation failed', error.issues));
    if (error instanceof AppError) return reply.status(error.statusCode).send(errorResponse(error.code, error.message, error.details));
    app.log.error(error);
    return reply.status(500).send(errorResponse('internal_error', 'An unexpected error occurred'));
  });
  return app;
}
```

Create `apps/server/src/index.ts`:

```ts
import {loadConfig} from './config';
import {buildApp} from './app';

const config = loadConfig();
const app = await buildApp(config);
await app.listen({host: config.host, port: config.port});
app.log.info(`Playlist2Video server listening on http://${config.host}:${config.port}`);
```

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm install
npm test -- apps/server/src
git add apps/server package.json package-lock.json
git commit -m "feat: add local project API and audio scanner"
```

Expected: PASS.

---

## Task 4: Remotion Template and `playlist-v4`

**Files:**
- Create: `packages/video-template/package.json`
- Create: `packages/video-template/tsconfig.json`
- Create all files under `packages/video-template/src`
- Test: `packages/video-template/src/themes/registry.test.ts`

- [ ] **Step 1: Add package files**

Create `packages/video-template/package.json`:

```json
{
  "name": "@playlist2video/video-template",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "@playlist2video/shared": "0.1.0",
    "@remotion/media-utils": "latest",
    "remotion": "latest"
  }
}
```

Create `packages/video-template/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Write registry test**

Create `packages/video-template/src/themes/registry.test.ts`:

```ts
import {expect, it} from 'vitest';
import {getThemeComponent, registeredThemeIds} from './registry';

it('registers only playlist-v4 for MVP', () => {
  expect(registeredThemeIds).toEqual(['playlist-v4']);
  expect(getThemeComponent('playlist-v4')).toBeTypeOf('function');
});
```

Run:

```bash
npm test -- packages/video-template/src
```

Expected: FAIL because registry does not exist.

- [ ] **Step 3: Add Remotion root and registry**

Create `packages/video-template/src/index.ts`:

```ts
export {PlaylistVideo} from './PlaylistVideo';
export {RemotionRoot} from './Root';
export type {PlaylistVideoProps} from './PlaylistVideo';
```

Create `packages/video-template/src/PlaylistVideo.tsx`:

```tsx
import React from 'react';
import type {Project} from '@playlist2video/shared';
import {getThemeComponent} from './themes/registry';

export interface PlaylistVideoProps {
  project: Project;
}

export const PlaylistVideo: React.FC<PlaylistVideoProps> = (props) => {
  const Theme = getThemeComponent(props.project.theme.themeId);
  return <Theme {...props} />;
};
```

Create `packages/video-template/src/Root.tsx`:

```tsx
import React from 'react';
import {Composition, type CalculateMetadataFunction} from 'remotion';
import {buildTimeline, getTotalDuration} from '@playlist2video/shared';
import {PlaylistVideo, type PlaylistVideoProps} from './PlaylistVideo';

const fps = 30;
const calculateMetadata: CalculateMetadataFunction<PlaylistVideoProps> = ({props}) => ({
  durationInFrames: Math.max(1, Math.ceil(getTotalDuration(buildTimeline(props.project.tracks)) * fps)),
  fps,
  width: props.project.exportConfig.width,
  height: props.project.exportConfig.height,
  props,
});

export const RemotionRoot: React.FC = () => (
  <Composition
    id="PlaylistVideo"
    component={PlaylistVideo}
    durationInFrames={30}
    fps={fps}
    width={1920}
    height={1080}
    defaultProps={{
      project: {
        id: 'preview-project',
        name: 'Preview',
        sourceFolder: '',
        tracks: [],
        theme: {themeId: 'playlist-v4', effectIntensity: 'high', showParticles: true, showPulseRings: true, playlistPanelMode: 'full'},
        exportConfig: {width: 1920, height: 1080, fps: 30, videoCodec: 'h264', outputFileName: 'playlist-video.mp4'},
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
    }}
    calculateMetadata={calculateMetadata}
  />
);
```

Create `packages/video-template/src/themes/registry.ts`:

```ts
import type {ComponentType} from 'react';
import type {ThemeId} from '@playlist2video/shared';
import type {PlaylistVideoProps} from '../PlaylistVideo';
import {PlaylistV4Theme} from './playlist-v4/PlaylistV4Theme';

export type ThemeComponent = ComponentType<PlaylistVideoProps>;

const registry: Record<ThemeId, ThemeComponent> = {
  'playlist-v4': PlaylistV4Theme,
};

export const registeredThemeIds = Object.keys(registry) as ThemeId[];
export const getThemeComponent = (themeId: ThemeId): ThemeComponent => registry[themeId];
```

- [ ] **Step 4: Add `playlist-v4` components**

Create `packages/video-template/src/themes/playlist-v4/PlaylistPanel.tsx`:

```tsx
import React from 'react';
import type {TimelineTrack} from '@playlist2video/shared';

const fmt = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

export const PlaylistPanel: React.FC<{timeline: TimelineTrack[]; currentTrackId: string | null; totalDurationSeconds: number}> = ({timeline, currentTrackId, totalDurationSeconds}) => (
  <aside className="p2v-playlist-panel">
    <div className="p2v-playlist-header">
      <div><strong>FULL PLAYLIST</strong><span>Total {fmt(totalDurationSeconds)}</span></div>
      <em>{timeline.length} tracks</em>
    </div>
    <div className="p2v-playlist-items">
      {timeline.map((track, index) => (
        <div className={track.id === currentTrackId ? 'p2v-playlist-item active' : 'p2v-playlist-item'} key={track.id}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <b>{track.title} — {track.artist}</b>
          <i>{fmt(track.durationSeconds)}</i>
        </div>
      ))}
    </div>
  </aside>
);
```

Create `packages/video-template/src/themes/playlist-v4/Waveform.tsx`:

```tsx
import React from 'react';

export const Waveform: React.FC<{energy: number}> = ({energy}) => (
  <div className="p2v-waveform">
    {Array.from({length: 96}, (_, index) => {
      const wave = Math.sin(index * 0.42 + energy * 8) * 0.5 + 0.5;
      return <div className="p2v-wave-bar" key={index} style={{height: `${Math.min(96, 18 + wave * 62 + energy * 20)}%`}} />;
    })}
  </div>
);
```

Create `packages/video-template/src/themes/playlist-v4/BeatEffects.tsx`:

```tsx
import React from 'react';
import type {ThemeConfig} from '@playlist2video/shared';

export const BeatEffects: React.FC<{energy: number; config: ThemeConfig}> = ({energy, config}) => {
  const opacity = config.effectIntensity === 'low' ? 0.25 : config.effectIntensity === 'medium' ? 0.45 : 0.7;
  return (
    <>
      {config.showPulseRings ? (
        <>
          <div className="p2v-ring p2v-ring-one" style={{opacity: opacity + energy * 0.2}} />
          <div className="p2v-ring p2v-ring-two" style={{opacity: opacity * 0.8 + energy * 0.2}} />
          <div className="p2v-ring p2v-ring-three" style={{opacity: opacity * 0.7 + energy * 0.2}} />
        </>
      ) : null}
      <div className="p2v-strobe" style={{opacity: opacity * 0.4 + energy * 0.4}} />
      <div className="p2v-flash" style={{opacity: opacity * 0.2 + energy * 0.35}} />
      {config.showParticles ? <div className="p2v-particles" /> : null}
    </>
  );
};
```

Create `packages/video-template/src/themes/playlist-v4/PlaylistV4Theme.tsx`:

```tsx
import React from 'react';
import {Img, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {buildTimeline, findTrackAtTime, getTotalDuration} from '@playlist2video/shared';
import type {PlaylistVideoProps} from '../../PlaylistVideo';
import {BeatEffects} from './BeatEffects';
import {PlaylistPanel} from './PlaylistPanel';
import {Waveform} from './Waveform';
import './theme.css';

const fmt = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

export const PlaylistV4Theme: React.FC<PlaylistVideoProps> = ({project}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const currentTime = frame / fps;
  const timeline = buildTimeline(project.tracks);
  const currentTrack = findTrackAtTime(timeline, currentTime);
  const totalDurationSeconds = getTotalDuration(timeline);
  const index = currentTrack ? timeline.findIndex((track) => track.id === currentTrack.id) : 0;
  const localTime = currentTrack ? currentTime - currentTrack.startSeconds : 0;
  const progress = currentTrack ? localTime / currentTrack.durationSeconds : 0;
  const energy = interpolate(Math.sin(frame / 5), [-1, 1], [0.15, 1]);

  if (!currentTrack) return <div className="p2v-root p2v-empty">No tracks loaded</div>;

  return (
    <div className="p2v-root">
      <div className="p2v-bg" />
      <BeatEffects energy={energy} config={project.theme} />
      <main className="p2v-layout">
        <section className="p2v-now">
          <div className="p2v-cover-wrap">
            <div className="p2v-cover-glow" style={{transform: `scale(${1 + energy * 0.06})`}} />
            {currentTrack.coverPath ? <Img className="p2v-cover" src={`file://${currentTrack.coverPath}`} /> : <div className="p2v-cover" />}
          </div>
          <div className="p2v-copy">
            <div className="p2v-kicker">NOW PLAYING · {String(index + 1).padStart(2, '0')} / {timeline.length}</div>
            <h1>{currentTrack.title}</h1>
            <p>{currentTrack.artist}{currentTrack.album ? ` — ${currentTrack.album}` : ''}</p>
            <div className="p2v-progress">
              <div className="p2v-time-row"><span>{fmt(localTime)}</span><span>{fmt(currentTrack.durationSeconds)}</span></div>
              <div className="p2v-progress-track"><div style={{width: `${Math.max(0, Math.min(100, progress * 100))}%`}} /></div>
            </div>
          </div>
        </section>
        <PlaylistPanel timeline={timeline} currentTrackId={currentTrack.id} totalDurationSeconds={totalDurationSeconds} />
      </main>
      <Waveform energy={energy} />
    </div>
  );
};
```

- [ ] **Step 5: Add CSS**

Create `packages/video-template/src/themes/playlist-v4/theme.css`:

```css
.p2v-root{width:100%;height:100%;position:relative;overflow:hidden;background:#020617;color:white;font-family:Inter,Arial,sans-serif}
.p2v-empty{display:flex;align-items:center;justify-content:center;font-size:64px}
.p2v-bg{position:absolute;inset:-60px;background:radial-gradient(circle at 20% 26%,rgba(249,115,22,.95),transparent 27%),radial-gradient(circle at 72% 30%,rgba(168,85,247,.88),transparent 32%),radial-gradient(circle at 48% 78%,rgba(37,99,235,.78),transparent 34%),#0f172a;filter:blur(28px)}
.p2v-layout{position:absolute;inset:5.6% 4.8% 16.8%;display:grid;grid-template-columns:minmax(0,1fr) 34%;gap:44px}
.p2v-now{display:grid;grid-template-columns:38% minmax(0,1fr);gap:42px;align-items:center}
.p2v-cover-wrap{position:relative}.p2v-cover-glow{position:absolute;inset:-18%;border-radius:48px;background:linear-gradient(135deg,#fbbf24,#f97316,#7c3aed,#22d3ee);filter:blur(42px);opacity:.72}
.p2v-cover{position:relative;width:100%;aspect-ratio:1;object-fit:cover;border-radius:42px;background:linear-gradient(135deg,#fde68a,#fb923c 48%,#7c2d12);box-shadow:0 42px 90px rgba(0,0,0,.42)}
.p2v-kicker{color:#fbbf24;font-size:26px;font-weight:800;letter-spacing:.14em;margin-bottom:22px}.p2v-copy h1{margin:0;font-size:92px;line-height:.95;letter-spacing:-.07em}.p2v-copy p{margin:28px 0 0;color:rgba(255,255,255,.72);font-size:34px}
.p2v-progress{margin-top:54px}.p2v-time-row{display:flex;justify-content:space-between;color:rgba(255,255,255,.64);font-size:24px;margin-bottom:14px}.p2v-progress-track{height:12px;border-radius:999px;background:rgba(255,255,255,.18);overflow:hidden}.p2v-progress-track div{height:100%;border-radius:999px;background:linear-gradient(90deg,#fbbf24,#f97316)}
.p2v-playlist-panel{border-radius:38px;background:rgba(2,6,23,.52);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(16px);overflow:hidden}.p2v-playlist-header{padding:30px 34px 24px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;align-items:flex-start}.p2v-playlist-header strong{display:block;font-size:28px;letter-spacing:.08em}.p2v-playlist-header span,.p2v-playlist-header em{display:block;color:rgba(255,255,255,.58);font-size:22px;font-style:normal;margin-top:8px}
.p2v-playlist-items{padding:16px;display:grid;gap:9px}.p2v-playlist-item{display:grid;grid-template-columns:48px 1fr auto;gap:16px;align-items:center;border-radius:22px;padding:14px 16px;color:rgba(255,255,255,.72);font-size:22px}.p2v-playlist-item b{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:600}.p2v-playlist-item i{opacity:.55;font-style:normal}.p2v-playlist-item.active{color:white;background:linear-gradient(90deg,rgba(251,191,36,.24),rgba(249,115,22,.1));border:1px solid rgba(251,191,36,.32)}
.p2v-waveform{position:absolute;left:4.8%;right:4.8%;bottom:4.2%;height:10%;border-radius:38px;background:rgba(2,6,23,.46);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;gap:5px;padding:18px 46px}.p2v-wave-bar{flex:1 1 0;max-width:12px;min-width:4px;border-radius:999px;background:linear-gradient(180deg,#fde68a,#f97316);box-shadow:0 0 16px rgba(251,191,36,.42)}
.p2v-ring,.p2v-strobe,.p2v-flash,.p2v-particles{position:absolute;pointer-events:none}.p2v-ring{border-radius:999px;border:4px solid rgba(251,191,36,.35)}.p2v-ring-one{left:10%;top:15%;width:30%;aspect-ratio:1}.p2v-ring-two{left:38%;top:55%;width:22%;aspect-ratio:1;border-color:rgba(34,211,238,.35)}.p2v-ring-three{left:70%;top:18%;width:18%;aspect-ratio:1;border-color:rgba(168,85,247,.38)}.p2v-strobe,.p2v-flash{inset:0;mix-blend-mode:screen}.p2v-strobe{background:conic-gradient(from 90deg at 50% 50%,transparent 0 18%,rgba(251,191,36,.16) 20%,transparent 24%,transparent 49%,rgba(168,85,247,.14) 52%,transparent 58%)}.p2v-flash{background:radial-gradient(circle at 21% 45%,rgba(251,191,36,.3),transparent 32%),radial-gradient(circle at 58% 85%,rgba(34,211,238,.2),transparent 30%)}
```

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test -- packages/video-template/src
git add packages/video-template package.json package-lock.json
git commit -m "feat: add Remotion playlist theme"
```

Expected: PASS.

---

## Task 5: Web UI Shell, Preview, and Theme Panel

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/index.html`
- Create: all files under `apps/web/src`
- Test: `apps/web/src/components/ThemePanel.test.tsx`

- [ ] **Step 1: Add web package**

Create `apps/web/package.json`:

```json
{
  "name": "@playlist2video/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 5173",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run src"
  },
  "dependencies": {
    "@playlist2video/shared": "0.1.0",
    "@playlist2video/video-template": "0.1.0",
    "@remotion/player": "latest",
    "react": "latest",
    "react-dom": "latest"
  }
}
```

Create `apps/web/tsconfig.json`:

```json
{"extends":"../../tsconfig.base.json","compilerOptions":{"composite":true},"include":["src"]}
```

Create `apps/web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Playlist2Video</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

- [ ] **Step 2: Create web test setup and theme test**

Create `apps/web/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Create `apps/web/src/components/ThemePanel.test.tsx`:

```tsx
import {render, screen} from '@testing-library/react';
import {expect, it} from 'vitest';
import {ThemePanel} from './ThemePanel';

it('shows the single MVP theme as selected', () => {
  render(<ThemePanel />);
  expect(screen.getByText('Playlist V4')).toBeInTheDocument();
  expect(screen.getByText('Selected')).toBeInTheDocument();
});
```

Run:

```bash
npm test -- apps/web/src
```

Expected: FAIL because `ThemePanel` does not exist.

- [ ] **Step 3: Implement API client and state**

Create `apps/web/src/api/client.ts`:

```ts
import type {Project} from '@playlist2video/shared';
const apiBase = 'http://127.0.0.1:4317/api/v1';
interface ApiSuccess<T> { data: T }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {headers: {'Content-Type': 'application/json', ...options?.headers}, ...options});
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? 'Request failed');
  return (body as ApiSuccess<T>).data;
}

export const scanFolder = (folderPath: string) => request<{project: Project; warnings: string[]}>('/projects/scan', {method: 'POST', body: JSON.stringify({folderPath})});
export const getCurrentProject = () => request<Project>('/projects/current');
export const reorderTracks = (trackIds: string[]) => request<Project>('/projects/current/reorder', {method: 'PATCH', body: JSON.stringify({trackIds})});
export const updateTrackMetadata = (input: {trackId: string; title: string; artist: string}) => request<Project>('/projects/current/tracks', {method: 'PATCH', body: JSON.stringify(input)});
export const exportCurrentProject = () => request<{outputPath: string}>('/exports', {method: 'POST'});
```

Create `apps/web/src/state/project-store.ts`:

```ts
import {useCallback, useState} from 'react';
import type {Project} from '@playlist2video/shared';
import * as client from '../api/client';

export function useProjectStore() {
  const [project, setProject] = useState<Project | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const scan = useCallback(async (folderPath: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.scanFolder(folderPath);
      setProject(result.project);
      setWarnings(result.warnings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const reorder = useCallback(async (trackIds: string[]) => setProject(await client.reorderTracks(trackIds)), []);
  const updateTrack = useCallback(async (input: {trackId: string; title: string; artist: string}) => setProject(await client.updateTrackMetadata(input)), []);
  return {project, warnings, error, loading, scan, reorder, updateTrack};
}
```

- [ ] **Step 4: Implement components**

Create `apps/web/src/components/FolderImporter.tsx`:

```tsx
import React, {useState} from 'react';

export const FolderImporter: React.FC<{loading: boolean; onScan: (folderPath: string) => void}> = ({loading, onScan}) => {
  const [folderPath, setFolderPath] = useState('');
  return (
    <section className="card">
      <h2>Import local audio folder</h2>
      <p>Enter a local folder path containing MP3, FLAC, WAV, M4A, AAC, or OGG files.</p>
      <form onSubmit={(event) => { event.preventDefault(); onScan(folderPath); }}>
        <input value={folderPath} onChange={(event) => setFolderPath(event.target.value)} placeholder="C:\\Users\\You\\Music\\Playlist" />
        <button disabled={loading || folderPath.trim().length === 0}>{loading ? 'Scanning...' : 'Scan folder'}</button>
      </form>
    </section>
  );
};
```

Create `apps/web/src/components/ThemePanel.tsx`:

```tsx
import React from 'react';
import {themeOptions} from '@playlist2video/shared';

export const ThemePanel: React.FC = () => (
  <section className="card">
    <h2>Theme</h2>
    <div className="theme-option selected">
      <strong>{themeOptions[0].name}</strong>
      <p>{themeOptions[0].description}</p>
      <span>Selected</span>
    </div>
  </section>
);
```

Create `apps/web/src/components/PlaylistEditor.tsx`:

```tsx
import React from 'react';
import type {Project} from '@playlist2video/shared';

export const PlaylistEditor: React.FC<{
  project: Project;
  onReorder: (trackIds: string[]) => void;
  onUpdateTrack: (input: {trackId: string; title: string; artist: string}) => void;
}> = ({project, onReorder, onUpdateTrack}) => {
  const tracks = [...project.tracks].sort((a, b) => a.order - b.order);
  return (
    <section className="card playlist-editor">
      <div className="section-heading"><h2>Playlist</h2><span>{tracks.length} tracks</span></div>
      <div className="track-list">
        {tracks.map((track, index) => (
          <article className="track-row" key={track.id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {track.coverPath ? <img src={`file://${track.coverPath}`} alt="" /> : <div className="cover-placeholder" />}
            <div>
              <input value={track.title} onChange={(event) => onUpdateTrack({trackId: track.id, title: event.target.value, artist: track.artist})} />
              <input value={track.artist} onChange={(event) => onUpdateTrack({trackId: track.id, title: track.title, artist: event.target.value})} />
            </div>
            <time>{Math.floor(track.durationSeconds / 60)}:{Math.floor(track.durationSeconds % 60).toString().padStart(2, '0')}</time>
          </article>
        ))}
      </div>
      <button onClick={() => onReorder(tracks.map((track) => track.id))}>Save current order</button>
    </section>
  );
};
```

Create `apps/web/src/components/VideoPreview.tsx`:

```tsx
import React from 'react';
import {Player} from '@remotion/player';
import {buildTimeline, getTotalDuration, type Project} from '@playlist2video/shared';
import {PlaylistVideo} from '@playlist2video/video-template';

export const VideoPreview: React.FC<{project: Project | null}> = ({project}) => {
  if (!project) return <section className="card preview-empty">Scan a folder to preview the video.</section>;
  const durationInFrames = Math.max(1, Math.ceil(getTotalDuration(buildTimeline(project.tracks)) * project.exportConfig.fps));
  return (
    <section className="card preview-card">
      <h2>Preview</h2>
      <Player component={PlaylistVideo} inputProps={{project}} durationInFrames={durationInFrames} compositionWidth={project.exportConfig.width} compositionHeight={project.exportConfig.height} fps={project.exportConfig.fps} controls style={{width: '100%', aspectRatio: '16 / 9'}} />
    </section>
  );
};
```

Create `apps/web/src/components/ExportPanel.tsx`:

```tsx
import React, {useState} from 'react';
import type {Project} from '@playlist2video/shared';
import {exportCurrentProject} from '../api/client';

export const ExportPanel: React.FC<{project: Project | null}> = ({project}) => {
  const [exporting, setExporting] = useState(false);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      setOutputPath((await exportCurrentProject()).outputPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="card">
      <h2>Export</h2>
      <p>Default output: 1920x1080, 30fps, MP4.</p>
      <button disabled={!project || exporting} onClick={handleExport}>{exporting ? 'Exporting...' : 'Export MP4'}</button>
      {outputPath ? <p>Exported to {outputPath}</p> : null}
      {error ? <p className="inline-error">{error}</p> : null}
    </section>
  );
};
```

- [ ] **Step 5: Implement app shell and CSS**

Create `apps/web/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import {App} from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
```

Create `apps/web/src/App.tsx`:

```tsx
import React from 'react';
import {ExportPanel} from './components/ExportPanel';
import {FolderImporter} from './components/FolderImporter';
import {PlaylistEditor} from './components/PlaylistEditor';
import {ThemePanel} from './components/ThemePanel';
import {VideoPreview} from './components/VideoPreview';
import {useProjectStore} from './state/project-store';

export const App: React.FC = () => {
  const store = useProjectStore();
  return (
    <div className="app-shell">
      <header><span>Playlist2Video</span><h1>Turn a local music folder into a playlist video.</h1></header>
      <main>
        <div className="left-column">
          <FolderImporter loading={store.loading} onScan={store.scan} />
          {store.error ? <div className="error-box">{store.error}</div> : null}
          {store.warnings.length > 0 ? <div className="warning-box">{store.warnings.join('\n')}</div> : null}
          {store.project ? <PlaylistEditor project={store.project} onReorder={store.reorder} onUpdateTrack={store.updateTrack} /> : null}
        </div>
        <div className="right-column">
          <VideoPreview project={store.project} />
          <ThemePanel />
          <ExportPanel project={store.project} />
        </div>
      </main>
    </div>
  );
};
```

Create `apps/web/src/styles.css`:

```css
:root{color:#e5e7eb;background:#020617;font-family:Inter,ui-sans-serif,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0}button,input{font:inherit}button{border:0;border-radius:12px;padding:10px 14px;background:linear-gradient(90deg,#fbbf24,#f97316);color:#111827;font-weight:800;cursor:pointer}button:disabled{cursor:not-allowed;opacity:.5}input{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 12px;color:white;background:rgba(15,23,42,.78)}.app-shell{min-height:100vh;padding:32px}header{margin-bottom:28px}header span{color:#fbbf24;font-weight:900;letter-spacing:.1em;text-transform:uppercase}header h1{max-width:920px;margin:8px 0 0;font-size:clamp(34px,5vw,72px);line-height:.95;letter-spacing:-.06em}main{display:grid;grid-template-columns:minmax(360px,.9fr) minmax(520px,1.4fr);gap:22px;align-items:start}.left-column,.right-column{display:grid;gap:18px}.card,.error-box,.warning-box{border:1px solid rgba(255,255,255,.1);border-radius:22px;background:rgba(15,23,42,.72);padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.25)}.error-box{border-color:rgba(248,113,113,.45);color:#fecaca}.warning-box{white-space:pre-wrap;border-color:rgba(251,191,36,.38);color:#fde68a}.card h2{margin:0 0 10px}.card form{display:flex;gap:10px;margin-top:16px}.section-heading{display:flex;justify-content:space-between;align-items:center}.track-list{display:grid;gap:10px;margin:14px 0}.track-row{display:grid;grid-template-columns:40px 54px 1fr 64px;align-items:center;gap:12px;padding:10px;border-radius:16px;background:rgba(2,6,23,.42)}.track-row img,.cover-placeholder{width:54px;height:54px;border-radius:12px;object-fit:cover;background:linear-gradient(135deg,#fbbf24,#7c3aed)}.track-row div{display:grid;gap:6px}.theme-option{border:1px solid rgba(251,191,36,.38);border-radius:16px;padding:14px;background:rgba(251,191,36,.08)}.theme-option p{color:rgba(255,255,255,.7)}.theme-option span{color:#fbbf24;font-weight:800}.preview-empty{min-height:320px;display:grid;place-items:center;color:rgba(255,255,255,.58)}.inline-error{color:#fecaca}@media(max-width:1100px){main{grid-template-columns:1fr}}
```

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test -- apps/web/src
git add apps/web package.json package-lock.json
git commit -m "feat: add local web UI shell"
```

Expected: PASS.

---

## Task 6: Export Pipeline

**Files:**
- Modify: `apps/server/package.json`
- Create: `apps/server/src/modules/exports/export-service.ts`
- Create: `apps/server/src/modules/exports/export-routes.ts`
- Modify: `apps/server/src/app.ts`
- Test: `apps/server/src/modules/exports/export-service.test.ts`

- [ ] **Step 1: Add server dependencies**

Modify `apps/server/package.json` dependencies so it includes these entries alongside existing dependencies:

```json
"@remotion/bundler": "latest",
"@remotion/renderer": "latest",
"execa": "latest"
```

Run:

```bash
npm install
```

- [ ] **Step 2: Write export tests**

Create `apps/server/src/modules/exports/export-service.test.ts`:

```ts
import path from 'node:path';
import {expect, it} from 'vitest';
import {buildFfmpegConcatList, getOutputPath} from './export-service';

it('builds a quoted concat list for FFmpeg', () => {
  expect(buildFfmpegConcatList(['C:/Music/01.mp3', "C:/Music/O'Hara.mp3"])).toBe("file 'C:/Music/01.mp3'\nfile 'C:/Music/O'\\''Hara.mp3'\n");
});

it('resolves output path inside output directory', () => {
  expect(getOutputPath(path.resolve('output'), 'playlist-video.mp4')).toBe(path.join(path.resolve('output'), 'playlist-video.mp4'));
});
```

Run:

```bash
npm test -- apps/server/src/modules/exports/export-service.test.ts
```

Expected: FAIL because export service does not exist.

- [ ] **Step 3: Implement export service**

Create `apps/server/src/modules/exports/export-service.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import type {Project} from '@playlist2video/shared';
import {execa} from 'execa';
import {resolveInside} from '../../lib/path-safety';

export function escapeFfmpegConcatPath(filePath: string): string {
  return filePath.replaceAll("'", "'\\''");
}

export function buildFfmpegConcatList(filePaths: string[]): string {
  return filePaths.map((filePath) => `file '${escapeFfmpegConcatPath(filePath)}'`).join('\n') + '\n';
}

export function getOutputPath(outputDir: string, outputFileName: string): string {
  return resolveInside(outputDir, outputFileName);
}

export async function exportProject(options: {project: Project; outputDir: string; workspaceDir: string; onProgress?: (progress: number) => void}): Promise<{outputPath: string}> {
  await fs.mkdir(options.outputDir, {recursive: true});
  const tempDir = path.join(options.workspaceDir, '.tmp', `export-${Date.now()}`);
  await fs.mkdir(tempDir, {recursive: true});

  const tracks = [...options.project.tracks].sort((a, b) => a.order - b.order);
  const concatListPath = path.join(tempDir, 'audio-list.txt');
  const concatAudioPath = path.join(tempDir, 'audio.m4a');
  const videoOnlyPath = path.join(tempDir, 'video.mp4');
  const outputPath = getOutputPath(options.outputDir, options.project.exportConfig.outputFileName);

  await fs.writeFile(concatListPath, buildFfmpegConcatList(tracks.map((track) => track.sourcePath)), 'utf8');
  await execa('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', concatListPath, '-c:a', 'aac', '-b:a', '192k', concatAudioPath]);
  options.onProgress?.(0.2);

  const serveUrl = await bundle({entryPoint: path.resolve('packages/video-template/src/Root.tsx')});
  const composition = await selectComposition({serveUrl, id: 'PlaylistVideo', inputProps: {project: options.project}});
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: videoOnlyPath,
    inputProps: {project: options.project},
    onProgress: ({progress}) => options.onProgress?.(0.2 + progress * 0.6),
  });

  await execa('ffmpeg', ['-y', '-i', videoOnlyPath, '-i', concatAudioPath, '-c:v', 'copy', '-c:a', 'copy', '-shortest', outputPath]);
  options.onProgress?.(1);
  return {outputPath};
}
```

- [ ] **Step 4: Add export route**

Create `apps/server/src/modules/exports/export-routes.ts`:

```ts
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
```

Modify `apps/server/src/app.ts` by adding:

```ts
import {registerExportRoutes} from './modules/exports/export-routes';
```

Then after `await registerProjectRoutes(app, config);`, add:

```ts
await registerExportRoutes(app, config);
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- apps/server/src/modules/exports/export-service.test.ts
npm run typecheck
git add apps/server package.json package-lock.json
git commit -m "feat: add MP4 export pipeline"
```

Expected: PASS.

---

## Task 7: Integration Tests, Documentation, and Manual QA

**Files:**
- Create: `apps/server/src/test/create-fixture-audio.ts`
- Test: `apps/server/src/modules/audio/scan-folder.integration.test.ts`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add FFmpeg fixture helper**

Create `apps/server/src/test/create-fixture-audio.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import {execa} from 'execa';

export async function createFixtureAudio(folderPath: string): Promise<string[]> {
  await fs.mkdir(folderPath, {recursive: true});
  const first = path.join(folderPath, '01 - sine.mp3');
  const second = path.join(folderPath, '02 - higher_sine.mp3');
  await execa('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', first]);
  await execa('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=660:duration=1', second]);
  return [first, second];
}
```

- [ ] **Step 2: Add scan integration test**

Create `apps/server/src/modules/audio/scan-folder.integration.test.ts`:

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {createFixtureAudio} from '../../test/create-fixture-audio';
import {scanFolder} from './scan-folder';

describe('scanFolder integration', () => {
  it('scans generated audio fixtures', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'playlist2video-fixture-'));
    const audioDir = path.join(root, 'audio');
    const assetsDir = path.join(root, 'assets');
    await createFixtureAudio(audioDir);
    const result = await scanFolder({folderPath: audioDir, assetsDir});
    expect(result.tracks).toHaveLength(2);
    expect(result.tracks[0].title).toContain('01 - sine');
    expect(result.tracks[0].durationSeconds).toBeGreaterThan(0);
    expect(result.tracks[0].coverPath).toContain('fallback');
  }, 30000);
});
```

- [ ] **Step 3: Update README**

Replace `README.md` with:

```md
# Playlist2Video

Playlist2Video is a local Web UI for turning a folder of audio files into a playlist video.

## Requirements

- Node.js 24+
- npm 11+
- FFmpeg available on `PATH`

## Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Workflow

1. Enter a local folder path containing `.mp3`, `.flac`, `.wav`, `.m4a`, `.aac`, or `.ogg`.
2. Click **Scan folder**.
3. Review title, artist, duration, and cover status.
4. Preview the `playlist-v4` theme.
5. Click **Export MP4**.
6. Find the exported file under `output/`.

## Verification

```bash
npm run verify
npm run verify:audit
```
```

- [ ] **Step 4: Update changelog**

Replace the `0.1.0` entry in `CHANGELOG.md` with:

```md
## [0.1.0] - 2026-06-15
### Features
- Added local Fastify API for scanning audio folders and storing project state.
- Added Vite React Web UI for importing folders, reviewing playlists, previewing video, and triggering export.
- Added shared TypeScript schemas, timeline helpers, and a single-theme registry.
- Added Remotion `playlist-v4` theme with full playlist panel, current-track highlight, bottom waveform, and beat-reactive effects.
- Added FFmpeg/Remotion export pipeline for 1080p MP4 output.

### Design Rationale
- Used a TypeScript stack to keep UI, server, shared contracts, and Remotion rendering aligned.
- Implemented a data-driven theme registry while shipping only one MVP theme.
- Used lightweight audio energy effects first to avoid advanced beat-detection complexity.

### Notes & Caveats
- The MVP is local-only.
- FFmpeg must be installed and available on `PATH`.
- Online playlist import, lyrics, desktop packaging, and additional themes remain future extensions.
```

- [ ] **Step 5: Run full verification**

Run:

```bash
npm run verify
npm run verify:audit
```

Expected: typecheck, tests, and audit pass. If FFmpeg is missing, install FFmpeg or add a guard that skips only `scan-folder.integration.test.ts` when `ffmpeg -version` is unavailable.

- [ ] **Step 6: Manual QA**

Run terminal 1:

```bash
npm run dev:server
```

Expected: server listening on `http://127.0.0.1:4317`.

Run terminal 2:

```bash
npm run dev:web
```

Expected: Vite serves `http://127.0.0.1:5173`.

Manual test:

1. Open `http://127.0.0.1:5173`.
2. Enter a folder path with two or more supported audio files.
3. Click **Scan folder**.
4. Confirm tracks appear in filename order.
5. Confirm preview renders the `playlist-v4` layout.
6. Seek the preview and confirm the right-panel highlight changes.
7. Click **Export MP4**.
8. Confirm an MP4 appears under `output/`.
9. Play the MP4 and confirm audio/video duration match.

- [ ] **Step 7: Commit final docs and tests**

Run:

```bash
git add README.md CHANGELOG.md apps/server/src/test apps/server/src/modules/audio/scan-folder.integration.test.ts
git commit -m "test: add integration verification and docs"
git status --short
```

Expected: clean working tree.

---

## Security Notes

- Bind the local API to `127.0.0.1` by default.
- Validate all request bodies with Zod.
- Restrict CORS to `http://localhost:5173` and `http://127.0.0.1:5173`.
- Reject empty paths and null bytes.
- Resolve final export paths inside `output/` to prevent path traversal.
- Do not expose stack traces to UI responses.
- Do not add authentication in the MVP because this is local-only; revisit if binding beyond loopback.

## Self-Review Notes

- Spec coverage: workspace, shared contracts, local scanner, metadata fallback, project store, API routes, Remotion preview/template, single-theme registry, export pipeline, tests, docs, and manual QA are covered.
- Theme scope: the plan implements only `playlist-v4` and keeps a registry for future themes.
- MVP exclusions: online playlist import, lyrics, desktop packaging, advanced beat detection, and additional themes are not included.
- Security: the plan includes local bind, schema validation, CORS restriction, path validation, and safe output resolution.
