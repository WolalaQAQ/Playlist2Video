# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root. Node 24+, npm 11+, and FFmpeg on `PATH` are required.

- `npm install` — install all workspace dependencies.
- `npm run dev` — start server + web together (web on `http://127.0.0.1:5173`, API on `http://127.0.0.1:4317`).
- `npm run build` — build every workspace (`tsc` project references).
- `npm test` — run all Vitest suites via the single root `vitest.config.ts`.
- `npm run test:watch` — Vitest in watch mode.
- `npm run typecheck` — `tsc -b` across all project references.
- `npm run verify` — typecheck + test; run this before declaring work done.
- `npm run verify:remotion` — smoke-test the Remotion bundle (`@playlist2video/video-template` `smoke:bundle`).
- `npm run verify:audit` — `npm audit --audit-level=moderate`.
- `npm run format` — Prettier across the repo.

Run a single test file or pattern (tests are colocated `*.test.ts(x)` and matched by the root config):

```bash
npx vitest run apps/server/src/modules/exports/export-service.test.ts
npx vitest run -t "detects hardware encoder"
```

There is no separate lint step; Prettier is the only formatter.

## Architecture

npm-workspaces monorepo, strict TypeScript, ESM throughout. Two apps and two shared packages, wired via `tsc -b` project references.

- `packages/shared` — Zod schemas and pure helpers. **Single source of truth for all data contracts.**
- `packages/video-template` — Remotion compositions and themes.
- `apps/server` — Fastify local API (audio scanning, project persistence, media serving, export).
- `apps/web` — React/Vite UI (`@playlist2video/web`).

### Shared schemas are the contract

`packages/shared/src/schemas.ts` defines `Project`, `Track`, `ThemeConfig`, and `ExportConfig` as Zod schemas, each with a paired `*PatchSchema` for partial updates. The server validates against them, the web app imports the inferred types, and the Remotion composition uses `ProjectSchema` as its input-props schema. Do not duplicate request/response shapes — extend or reuse these. `timeline.ts` (`buildTimeline`, `getTotalDuration`, `findTrackAtTime`) lays tracks end-to-end by `order` and is shared between the timeline UI and the renderer.

### Single-project model

The server persists exactly one project to `<workspace>/project.json` via `ProjectStore` (`apps/server/src/modules/projects/project-store.ts`). Every route operates on this "current project" through `store.load()` / `store.save()`. The workspace dir defaults to `process.cwd()` and also holds `assets/` (extracted covers), `output/` (exported MP4s), and `.tmp/` (export scratch). Configurable via `PLAYLIST2VIDEO_WORKSPACE`, `HOST`, `PORT` env vars (`apps/server/src/config.ts`).

### Request → data flow

1. **Scan** (`scan-folder.ts`): user supplies a local folder path → server enumerates supported audio, reads metadata (`music-metadata`), writes cover assets (or a generated fallback) via `sharp`, and extracts `waveformPeaks` + `spectrumFrames`. Result is saved as the current project.
2. **Edit**: reorder / track-metadata / settings PATCH routes mutate and re-save the project.
3. **Serve media**: `GET /api/v1/projects/current/media/:trackId/:kind` (`kind` = `audio` | `cover`) streams files with HTTP range support. `hydrateProjectMediaUrls` rewrites filesystem paths into browser-fetchable URLs before sending a project to the client.
4. **Preview**: the web app renders the project through `@remotion/player`.
5. **Export**: server-side render + FFmpeg mux (below).

Mind the three flavors of media path on a `Track`: `coverPath`/`sourcePath` (filesystem, server-side), `coverPreviewUrl`/`audioPreviewUrl` (browser, set by hydration), and `renderCoverPath` (used during Remotion render).

### Export pipeline (`apps/server/src/modules/exports/export-service.ts`)

The most intricate module. `exportProject` runs three stages into a per-run `.tmp/export-<ts>` dir, reporting progress 0→0.2 (audio) → 0.2–0.8 (video render) → 1 (final mux):

1. **Audio concat**: FFmpeg concat demuxer over the ordered track `sourcePath`s, re-encoded per `exportConfig` (codec/bitrate/sample rate/channels/volume).
2. **Video-only render** (`renderProjectVideoOnly`): bundles `packages/video-template/src/render-entry.tsx`, starts a Remotion bundle server, selects the `PlaylistVideo` composition, and renders an MP4 with `@remotion/renderer`.
3. **Final mux** (`runFinalFfmpegExport`): tries stream-copy first (no re-encode); on failure, probes for a GPU H.264 encoder (`h264_nvenc` → `h264_qsv` → `h264_amf`) and falls back to CPU `libx264`. GPU support is detected at runtime — never assume it exists; verify NVENC/QSV/AMF behavior when touching this path.

Every external step (`bundleRemotion`, `startBundleServer`, `renderMediaFn`, `runFfmpeg`, `detectHardwareEncoder`, …) is injectable, so tests exercise the pipeline without real FFmpeg or Remotion. Preserve this dependency-injection shape when extending.

### Remotion composition

`packages/video-template/src/Root.tsx` registers the `PlaylistVideo` composition; `calculateMetadata` derives `durationInFrames`/`fps`/`width`/`height` dynamically from the project's `exportConfig` and timeline. `PlaylistVideo` dispatches to a theme via the `getThemeComponent` registry — only `playlist-v4` exists today (the MVP theme).

### Conventions worth knowing

- **API envelope**: every response is `{data: ...}` or `{error: {code, message, details}}`. Build them with `data()` / `errorResponse()` (`lib/api-response.ts`). Throw `AppError(code, message, statusCode, details)` for domain errors; the central `setErrorHandler` in `app.ts` maps `ZodError`→422, `AppError`→its status, else 500.
- **Path safety**: validate user-supplied paths with `assertSafeLocalPath`, and confine outputs with `resolveInside` (`lib/path-safety.ts`) to block traversal. Use these whenever handling folder paths or output filenames.
- **Preview ≠ export**: in-browser preview (`@remotion/player`) and MP4 export (server Remotion renderer + FFmpeg) are deliberately separate paths. Scanning, reordering, and parameter edits do **not** auto-regenerate the preview — the user triggers it explicitly. Keep this separation intact.
- **Formatting**: match the surrounding file (the codebase mixes single- and double-quote files); run `npm run format` rather than hand-aligning. React components are PascalCase with named exports; utilities camelCase; tests named after the unit under test.
