# Remotion Export Performance Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add export performance controls: independent spectrum FPS, lower render quality preset, lighter cover/effects/CSS rendering, FPS number input, and faster FFmpeg final mux.

**Architecture:** Extend shared export/theme schemas first, then wire server settings persistence and frontend controls, then adjust Remotion template behavior based on export settings. FFmpeg final export first attempts video stream-copy mux and falls back to the existing GPU/CPU re-encode path.

**Tech Stack:** TypeScript, React, Remotion, Fastify, Zod, Vitest, FFmpeg.

---

### Task 1: Shared schemas and UI tests

**Files:**
- Modify: `C:/Users/69546/Documents/Playlist2Video/packages/shared/src/schemas.ts`
- Modify: `C:/Users/69546/Documents/Playlist2Video/packages/shared/src/schemas.test.ts`
- Modify: `C:/Users/69546/Documents/Playlist2Video/apps/web/src/components/ThemePanel.test.tsx`

- [ ] Write failing tests for `spectrumFps`, `renderQuality`, `minimal` effect intensity, and FPS as a textbox.
- [ ] Run targeted tests and confirm expected failures.
- [ ] Add schema defaults and UI tests support.
- [ ] Run targeted tests and confirm pass.

### Task 2: Parameter panel implementation

**Files:**
- Modify: `C:/Users/69546/Documents/Playlist2Video/apps/web/src/components/ThemePanel.tsx`
- Modify: `C:/Users/69546/Documents/Playlist2Video/apps/web/src/i18n.ts`

- [ ] Implement FPS number input, spectrum FPS number input, and render quality selector.
- [ ] Run component tests.

### Task 3: Remotion render optimization behavior

**Files:**
- Modify: `C:/Users/69546/Documents/Playlist2Video/packages/video-template/src/PlaylistVideo.test.tsx`
- Modify: `C:/Users/69546/Documents/Playlist2Video/packages/video-template/src/Root.test.tsx`
- Modify: `C:/Users/69546/Documents/Playlist2Video/packages/video-template/src/Root.tsx`
- Modify: `C:/Users/69546/Documents/Playlist2Video/packages/video-template/src/themes/playlist-v4/PlaylistV4Theme.tsx`
- Modify: `C:/Users/69546/Documents/Playlist2Video/packages/video-template/src/themes/playlist-v4/BeatEffects.tsx`
- Modify: `C:/Users/69546/Documents/Playlist2Video/packages/video-template/src/themes/playlist-v4/Waveform.tsx`
- Modify: `C:/Users/69546/Documents/Playlist2Video/packages/video-template/src/themes/playlist-v4/theme.css`

- [ ] Write/adjust failing tests for quantized spectrum FPS and minimal CSS/effects.
- [ ] Implement quantized spectrum progress and render-quality root class.
- [ ] Gate particles/rings/strobe/flash and reduce CSS blur/shadow in minimal mode.
- [ ] Run video-template tests.

### Task 4: Cover resource resize and FFmpeg mux optimization

**Files:**
- Modify: `C:/Users/69546/Documents/Playlist2Video/apps/server/src/modules/audio/scan-folder.ts` or cover extraction helper
- Modify: relevant server tests under `C:/Users/69546/Documents/Playlist2Video/apps/server/src/modules/projects` and `exports`
- Modify: `C:/Users/69546/Documents/Playlist2Video/apps/server/src/modules/exports/export-service.ts`
- Modify: `C:/Users/69546/Documents/Playlist2Video/apps/server/src/modules/exports/export-service.test.ts`

- [ ] Write failing tests for resized cover extraction target and final FFmpeg copy-first fallback.
- [ ] Implement cover resize via existing Sharp dependency.
- [ ] Implement final mux stream-copy attempt before GPU/CPU re-encode.
- [ ] Run targeted server tests.

### Task 5: Verification and changelog

**Files:**
- Modify: `C:/Users/69546/Documents/Playlist2Video/CHANGELOG.md`

- [ ] Update changelog with performance controls and export pipeline notes.
- [ ] Run `npm test` and `npm run typecheck`.
- [ ] Report evidence and remaining caveats.
