# Now Playing Layer Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure now-playing metadata and progress information always render above playlist-v4 effect overlays.

**Architecture:** Keep the visual layout unchanged and add an explicit CSS layer map inside `theme.css`. Regression tests inspect the theme CSS to guarantee effects are below layout/metadata layers and critical text/progress selectors are positioned with higher z-index.

**Tech Stack:** React, Remotion theme CSS, Vitest/jsdom.

---

### Task 1: Layer-order regression test

**Files:**
- Modify: `packages/video-template/src/PlaylistVideo.test.tsx`

- [ ] **Step 1: Write failing test**
  Add a CSS regression test asserting `.p2v-bg` is z-index 0, effect overlays are z-index 1, `.p2v-layout` and `.p2v-copy` are z-index 3, and `.p2v-spectrum` stays above layout at z-index 4.

- [ ] **Step 2: Run targeted test**
  Run `npm test -- packages/video-template/src/PlaylistVideo.test.tsx` and verify the new test fails because current CSS has no explicit z-index map.

### Task 2: CSS layer map implementation

**Files:**
- Modify: `packages/video-template/src/themes/playlist-v4/theme.css`

- [ ] **Step 1: Add explicit layer map**
  Set `.p2v-bg{z-index:0}`, `.p2v-ring,.p2v-strobe,.p2v-flash,.p2v-particles{z-index:1}`, `.p2v-layout{z-index:3}`, `.p2v-now,.p2v-copy,.p2v-progress,.p2v-cover{position:relative;z-index:3}`, and `.p2v-spectrum{z-index:4}`.

- [ ] **Step 2: Run targeted tests**
  Run `npm test -- packages/video-template/src/PlaylistVideo.test.tsx` and verify it passes.

### Task 3: Verification

**Files:**
- No additional production files.

- [ ] **Step 1: Run full verification**
  Run `npm run verify` and confirm typecheck and tests pass.

- [ ] **Step 2: Browser smoke check if an app server is already available or can be started temporarily**
  Open the preview, inspect computed z-index values, and stop any temporary server started by Codex.
