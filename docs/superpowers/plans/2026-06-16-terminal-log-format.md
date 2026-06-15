# Terminal Log Format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Playlist2Video local development terminal output readable with labelled, colored server logs and labelled concurrent dev streams.

**Architecture:** Add a focused server logger module that selects test/development/production Fastify logger options and formats development Pino records through a terminal stream. Update root dev scripts to force color and label parallel web/server output.

**Tech Stack:** TypeScript, Fastify/Pino, Vitest, npm-run-all, cross-env.

---

### Task 1: Server terminal logger

**Files:**

- Create: `apps/server/src/lib/logger.ts`
- Test: `apps/server/src/lib/logger.test.ts`
- Modify: `apps/server/src/app.ts`

- [ ] Write failing tests for logger environment selection, icon fallback, and formatted `INFO`/`WARN`/`ERROR` lines.
- [ ] Run `npx vitest run apps/server/src/lib/logger.test.ts` and verify the tests fail because the module does not exist.
- [ ] Implement `apps/server/src/lib/logger.ts` with `getFastifyLoggerOptions()`, `createTerminalLogStream()`, `formatTerminalLogRecord()`, and icon/color helpers.
- [ ] Replace `Fastify({logger: true})` with `Fastify({logger: getFastifyLoggerOptions()})`.
- [ ] Run `npx vitest run apps/server/src/lib/logger.test.ts apps/server/src/app.test.ts` and verify the tests pass.

### Task 2: Label and preserve color for full dev output

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `apps/server/src/dev-scripts.test.ts`

- [ ] Write a failing test that reads root `package.json` and asserts the `dev` script uses `cross-env FORCE_COLOR=1` plus `npm-run-all --print-label --parallel dev:server dev:web`.
- [ ] Run `npx vitest run apps/server/src/dev-scripts.test.ts` and verify it fails with the current script.
- [ ] Install `cross-env` as a dev dependency.
- [ ] Update the root `dev` script.
- [ ] Run `npx vitest run apps/server/src/dev-scripts.test.ts` and verify it passes.

### Task 3: Documentation and verification

**Files:**

- Modify: `README.md`
- Modify: `README_zh.md`
- Modify: `CHANGELOG.md`

- [ ] Document readable terminal logging and `PLAYLIST2VIDEO_LOG_ICONS`.
- [ ] Add a changelog entry for the terminal output improvement.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Run a short dev-server smoke check, capture representative output, then stop any background server processes before reporting completion.
