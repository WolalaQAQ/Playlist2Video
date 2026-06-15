# Spectrum Effects Linkage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the playlist-v4 visual effects react to real spectrum energy so song intensity is visible beyond the spectrum bars.

**Architecture:** Add a small deterministic spectrum-energy helper in the Remotion theme. `PlaylistV4Theme` samples the current track spectrum at playback progress, computes low/mid/high/overall/peak energy, exposes them as CSS variables, and passes them to `BeatEffects`. `BeatEffects` maps low energy to rings/cover pulse, mid energy to background/strobe, and high/peak energy to particles and flashes.

**Tech Stack:** React, Remotion, TypeScript, Vitest/jsdom, CSS custom properties.

---

### Task 1: Regression tests for spectrum-driven effect energy

**Files:**
- Modify: `packages/video-template/src/PlaylistVideo.test.tsx`

- [ ] **Step 1: Write failing tests**
  Add tests that render low-heavy and high-heavy spectrum data and assert root CSS energy variables, pulse ring transforms, and particle children reflect the current spectrum frame.

- [ ] **Step 2: Run targeted test to verify it fails**
  Run: `npm test -- packages/video-template/src/PlaylistVideo.test.tsx`
  Expected: FAIL because `.p2v-root` has no `--low-energy`/`--high-energy` variables and particles do not render energy-driven children.

### Task 2: Spectrum energy helper and theme wiring

**Files:**
- Create: `packages/video-template/src/themes/playlist-v4/spectrumEnergy.ts`
- Modify: `packages/video-template/src/themes/playlist-v4/PlaylistV4Theme.tsx`
- Modify: `packages/video-template/src/themes/playlist-v4/BeatEffects.tsx`
- Modify: `packages/video-template/src/themes/playlist-v4/theme.css`

- [ ] **Step 1: Implement energy helper**
  Export `SpectrumEnergyProfile`, `spectrumFrameAt`, and `getSpectrumEnergyProfile`. Split bands into low/mid/high ranges, compute averages and peak, and provide deterministic fallback when spectrum frames are missing.

- [ ] **Step 2: Wire helper into PlaylistV4Theme**
  Replace the sine-only energy source with the current spectrum profile. Use `profile.overall` for spectrum bar energy, `profile.low` for cover pulse, and expose CSS variables on `.p2v-root`.

- [ ] **Step 3: Map profile into BeatEffects**
  Accept `energyProfile` instead of a scalar. Drive ring opacity/scale from low/mid/high, strobe from mid, flash from peak/high, and render deterministic particle spans from high/peak.

- [ ] **Step 4: Update CSS**
  Add CSS variable-driven background brightness/saturation, particle styling, and preserve current palette semantics.

- [ ] **Step 5: Run targeted tests**
  Run: `npm test -- packages/video-template/src/PlaylistVideo.test.tsx packages/video-template/src/themes/playlist-v4/Waveform.test.tsx`
  Expected: PASS.

### Task 3: Changelog and full verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add changelog entry**
  Add `0.1.3 - 2026-06-16` describing spectrum/effect linkage and rationale.

- [ ] **Step 2: Run full verification**
  Run: `npm run verify`
  Expected: typecheck and tests pass.

- [ ] **Step 3: Browser preview smoke test**
  Start dev server if needed, open the Web preview in the in-app browser, and verify `.p2v-root` CSS energy variables exist and spectrum/effects render. Stop any dev server started by Codex before reporting.
