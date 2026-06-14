# Dynamic Waveform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the bottom waveform playback-synchronized instead of a static whole-track thumbnail.

**Architecture:** Keep existing FFmpeg-extracted `waveformPeaks` on each track. In the Remotion theme, compute the current track-local playback progress from `useCurrentFrame()` and `fps`, then render a sliding window of bars centered around the current playback position. Add progress highlighting and current-energy pulse using existing beat/bass energy values.

**Tech Stack:** TypeScript, React, Remotion, Vitest, Testing Library, existing Playlist2Video shared schemas.

---

### Task 1: Add tests for dynamic waveform behavior

**Files:**
- Modify: `C:\Users\69546\Documents\Playlist2Video\packages\video-template\src\PlaylistVideo.test.tsx`

- [x] Add a mockable `useCurrentFrame()` frame variable in the Remotion mock.
- [x] Add a test that frame 0 and a later frame render different waveform bar heights from the same track peaks.
- [x] Add a test that rendered bars include progress state/classes around the playhead.

### Task 2: Implement dynamic waveform props and sampling

**Files:**
- Modify: `C:\Users\69546\Documents\Playlist2Video\packages\video-template\src\themes\playlist-v4\Waveform.tsx`
- Modify: `C:\Users\69546\Documents\Playlist2Video\packages\video-template\src\themes\playlist-v4\PlaylistV4Theme.tsx`

- [x] Change `Waveform` props to accept `peaks`, `progress`, `energy`, and optional `bars`.
- [x] Sample peaks from a sliding window around `progress` so visible bars move as playback advances.
- [x] Add `.is-played` and `.is-playhead` classes so CSS can highlight playback.
- [x] Pass `trackProgress` from `PlaylistV4Theme` using current frame relative to `currentTrack.startSeconds`.

### Task 3: Add visual polish without changing layout

**Files:**
- Modify: `C:\Users\69546\Documents\Playlist2Video\packages\video-template\src\themes\playlist-v4\theme.css`

- [x] Keep the waveform full-width and centered.
- [x] Add played/current bar color, glow, and beat/bass pulse via CSS variables.

### Task 4: Verify and commit

**Commands:**
- `npm run verify`
- `npm run verify:audit`
- `npx tsx .tmp\verify-hyperflip-waveform-range.ts`
- `npx tsx .tmp\ffmpeg-e2e.ts`
- `git status --short --branch`
- `git commit -m "feat: animate waveform with playback progress"`

