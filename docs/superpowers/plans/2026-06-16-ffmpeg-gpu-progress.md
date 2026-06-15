# FFmpeg Progress and GPU Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make export-time FFmpeg output visible in the terminal, attempt GPU-accelerated final H.264 export when available, and clearly fall back to CPU when GPU acceleration is unavailable or fails.

**Architecture:** Keep Remotion as the video renderer, enabling its safe `hardwareAcceleration: "if-possible"` path. Add focused FFmpeg helpers inside `apps/server/src/modules/exports/export-service.ts` for hardware encoder detection, final mux/encode argument construction, terminal output inheritance, and GPU-to-CPU fallback messaging.

**Tech Stack:** TypeScript, Vitest, execa, Remotion renderer, FFmpeg.

---

### Task 1: Add RED tests for FFmpeg hardware encoder selection and final export args

**Files:**

- Modify: `C:/Users/69546/Documents/Playlist2Video/apps/server/src/modules/exports/export-service.test.ts`
- Modify later: `C:/Users/69546/Documents/Playlist2Video/apps/server/src/modules/exports/export-service.ts`

- [ ] **Step 1: Write failing tests** for:
  - selecting `h264_nvenc`, `h264_qsv`, then `h264_amf` by priority from `ffmpeg -encoders` output
  - returning `null` when no supported hardware encoder is present
  - building GPU final export args with `-c:v <encoder>` and AAC copy
  - building CPU fallback final export args with `-c:v libx264`
  - building terminal-visible FFmpeg spawn options with inherited stdio

- [ ] **Step 2: Run** `npm test -- apps/server/src/modules/exports/export-service.test.ts`

Expected: FAIL because the new helper exports do not exist yet.

### Task 2: Implement helper functions minimally

**Files:**

- Modify: `C:/Users/69546/Documents/Playlist2Video/apps/server/src/modules/exports/export-service.ts`

- [ ] **Step 1: Add types and helpers**:
  - `type H264HardwareEncoder = "h264_nvenc" | "h264_qsv" | "h264_amf"`
  - `selectH264HardwareEncoder(encodersOutput: string)`
  - `buildFinalFfmpegArgs(...)`
  - `getVisibleFfmpegOptions()`

- [ ] **Step 2: Run** `npm test -- apps/server/src/modules/exports/export-service.test.ts`

Expected: PASS for helper tests.

### Task 3: Integrate detection, terminal output, and fallback into exportProject

**Files:**

- Modify: `C:/Users/69546/Documents/Playlist2Video/apps/server/src/modules/exports/export-service.ts`
- Modify: `C:/Users/69546/Documents/Playlist2Video/apps/server/src/modules/exports/export-service.test.ts`

- [ ] **Step 1: Add tests** for fallback message decisions using a pure fallback helper if possible.
- [ ] **Step 2: Update export flow**:
  - audio concat FFmpeg uses terminal-visible options
  - Remotion render gets `codec: project.exportConfig.videoCodec` and `hardwareAcceleration: "if-possible"`
  - final FFmpeg detects hardware encoder and tries GPU args first
  - if none found, print a CPU fallback message before running CPU args
  - if GPU run throws, print fallback message and rerun CPU args
- [ ] **Step 3: Run targeted tests**.

### Task 4: Documentation, changelog, and verification

**Files:**

- Modify: `C:/Users/69546/Documents/Playlist2Video/CHANGELOG.md`

- [ ] **Step 1: Add a 0.1.7 changelog entry** describing terminal FFmpeg progress output and GPU fallback.
- [ ] **Step 2: Run** `npm run typecheck` and `npm test`.
- [ ] \*\*Step 3: If FFmpeg is available, run a direct encoder detection command and report the detected/fallback behavior.
