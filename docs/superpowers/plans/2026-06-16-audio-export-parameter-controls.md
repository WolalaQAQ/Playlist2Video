# Audio Export Parameter Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the hard-coded export description and expose FFmpeg audio export settings in the WebUI parameter panel, with persistence and export command wiring.

**Architecture:** Extend the shared `ExportConfigSchema` so audio export settings flow through project persistence, API validation, WebUI controls, and server-side FFmpeg arguments. Keep audio codec conservative (`aac`) for MP4 compatibility, while making bitrate, sample rate, channels, and volume adjustable.

**Tech Stack:** TypeScript, React, Vitest, Zod, Fastify, FFmpeg via `execa`.

---

### Task 1: Shared export config schema

**Files:**
- Modify: `packages/shared/src/schemas.ts`
- Update typed test fixtures wherever `Project.exportConfig` literals are defined.

- [ ] Add `audioCodec`, `audioBitrateKbps`, `audioSampleRate`, `audioChannels`, and `audioVolumePercent` defaults to `ExportConfigSchema`.
- [ ] Run targeted TypeScript/tests to identify fixtures that need the new required output fields.

### Task 2: Parameter panel audio controls

**Files:**
- Modify: `apps/web/src/components/ThemePanel.tsx`
- Modify: `apps/web/src/components/ThemePanel.test.tsx`
- Modify: `apps/web/src/i18n.ts`

- [ ] Add failing tests for visible audio controls and save callbacks.
- [ ] Add an audio export fieldset with codec display, bitrate/sample-rate/channel selects, and volume numeric input.
- [ ] Add Chinese and English labels.

### Task 3: Export panel description removal

**Files:**
- Modify: `apps/web/src/components/ExportPanel.tsx`
- Modify: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/i18n.ts`

- [ ] Add failing test proving the hard-coded default output description is not rendered.
- [ ] Remove the description paragraph and translation entry.

### Task 4: FFmpeg audio argument wiring

**Files:**
- Modify: `apps/server/src/modules/exports/export-service.ts`
- Modify: `apps/server/src/modules/exports/export-service.test.ts`

- [ ] Add failing test for generated FFmpeg audio concat args.
- [ ] Implement `buildAudioFfmpegArgs()` and use it when producing the concatenated audio file.
- [ ] Keep final mux as stream copy so the configured audio encode happens exactly once.

### Task 5: Verification and docs

**Files:**
- Modify: `README.md`
- Modify: `README_zh.md`
- Modify: `CHANGELOG.md`

- [ ] Update docs to mention audio export controls.
- [ ] Run targeted tests, `npm run typecheck`, and `npm run verify`.
- [ ] Browser-check that the parameter panel contains the audio controls and export description is gone.
