# Parameter Adjustment Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent right-column parameter adjustment panel that saves all currently configurable theme and export settings for the current Playlist2Video project.

**Architecture:** Keep the panel as a focused React component replacing the static ThemePanel. Add one `PATCH /api/v1/projects/current/settings` endpoint that validates partial theme/export updates through existing shared Zod schemas and returns the hydrated project. Preserve the existing explicit preview workflow: changing settings saves the project but does not refresh Remotion preview until the user clicks Generate video.

**Tech Stack:** TypeScript, React, Fastify, Zod, Vitest, Testing Library, Remotion Player.

---

## File Structure

- `apps/server/src/modules/projects/project-routes.ts`: add settings request schema and PATCH route.
- `apps/server/src/modules/projects/project-routes.test.ts`: add route tests for saving theme/export settings and rejecting invalid values.
- `apps/web/src/api/client.ts`: add `updateProjectSettings` API client.
- `apps/web/src/state/project-store.ts`: expose `updateSettings` action.
- `apps/web/src/components/ThemePanel.tsx`: convert static theme card into persistent parameter adjustment panel.
- `apps/web/src/components/ThemePanel.test.tsx`: test controls call save handler and render current values.
- `apps/web/src/App.tsx`: pass current project and store action into the panel.
- `apps/web/src/App.test.tsx`: verify parameter changes do not auto-refresh generated preview.
- `apps/web/src/i18n.ts`: add Chinese/English labels for parameter groups and controls.
- `apps/web/src/styles.css`: style sliders/selects/toggles/layout while matching current UI.
- `CHANGELOG.md`, `README.md`, `README_zh.md`: document version-level parameter panel feature.

## Tasks

### Task 1: Server settings route

- [x] Baseline tests passed with `npm test -- apps/server/src/modules/projects/project-routes.test.ts apps/web/src/components/ThemePanel.test.tsx apps/web/src/App.test.tsx`.
- [ ] Write failing tests in `apps/server/src/modules/projects/project-routes.test.ts` for `PATCH /api/v1/projects/current/settings` saving theme/export settings and rejecting invalid dimensions/FPS/output filename.
- [ ] Run the server route test and confirm expected 404/validation failure before implementation.
- [ ] Implement settings schema and route in `apps/server/src/modules/projects/project-routes.ts`.
- [ ] Run server route test and confirm green.

### Task 2: Web API/store and panel component

- [ ] Write failing tests in `apps/web/src/components/ThemePanel.test.tsx` for effect intensity, particle/pulse toggles, resolution, FPS, and output filename controls calling `onUpdateSettings` with merged settings.
- [ ] Add failing app-level test in `apps/web/src/App.test.tsx` that changing settings saves project but leaves generated preview unchanged until Generate video is clicked.
- [ ] Implement `updateProjectSettings` in `apps/web/src/api/client.ts` and `updateSettings` in `apps/web/src/state/project-store.ts`.
- [ ] Replace static `ThemePanel` with a controlled parameter panel.
- [ ] Pass project/updateSettings from `App.tsx`.
- [ ] Run targeted web tests and confirm green.

### Task 3: Polish, docs, verification

- [ ] Add styles for panel controls in `apps/web/src/styles.css`.
- [ ] Update bilingual docs and changelog.
- [ ] Run `npm run verify`.
- [ ] Start local dev server, open WebUI in browser, verify parameter panel is visible and interactive, then stop dev server before reporting completion.
