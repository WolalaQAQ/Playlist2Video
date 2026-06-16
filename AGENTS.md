# Repository Guidelines

## Project Structure & Module Organization

Playlist2Video is an npm workspace TypeScript monorepo. `apps/web` contains the React/Vite UI, with components in `apps/web/src/components`, API calls in `apps/web/src/api`, and browser test setup in `apps/web/src/test`. `apps/server` contains the Fastify local API, organized by modules such as `audio`, `projects`, `exports`, and `assets` under `apps/server/src/modules`. Shared schemas, timeline helpers, and theme types live in `packages/shared/src`. Remotion compositions and themes live in `packages/video-template/src`, especially `themes/playlist-v4`. Tests are colocated as `*.test.ts` or `*.test.tsx`. Generated media, temporary exports, local playlists, and build outputs are ignored (`assets/`, `output/`, `.tmp/`, `playlists/`, `dist/`).

## Build, Test, and Development Commands

- `npm install` installs all workspace dependencies.
- `npm run dev` starts the server and web app together; open `http://127.0.0.1:5173`.
- `npm run build` builds every workspace.
- `npm test` runs Vitest across `apps/**` and `packages/**`.
- `npm run typecheck` runs TypeScript project checks.
- `npm run verify` runs typecheck plus tests before handoff.
- `npm run verify:remotion` smoke-tests the Remotion bundle.
- `npm run format` formats the repository with Prettier.

## Coding Style & Naming Conventions

Use strict TypeScript, ES modules, React function components, and named exports. Follow existing Prettier formatting: two-space indentation, single quotes, semicolons, and compact object spacing. Name React components in PascalCase (`VideoPreview.tsx`), utilities in camelCase, and tests after the unit under test (`project-store.test.ts`). Keep shared contracts in `packages/shared` and avoid duplicating request/response shapes.

## Testing Guidelines

Use Vitest for unit and integration tests; React UI tests use Testing Library with jsdom where needed. Keep tests close to implementation and prefer behavior-focused names. Add coverage for server route behavior, schema validation, media processing edge cases, and Remotion visual logic when changed. Run `npm run verify` before submitting changes; use workspace-specific tests for faster iteration.

## Commit & Pull Request Guidelines

History uses concise subjects, sometimes with conventional prefixes such as `feat:` and `fix:`. Prefer imperative, scoped messages like `fix: repair export request` and squash or clean up `WIP` commits before review. Pull requests should describe the user-visible change, list verification commands run, mention export/preview implications, and include screenshots or short recordings for UI or video-template changes.

## Security & Configuration Tips

Keep local paths, media files, `.env*`, generated assets, and FFmpeg outputs out of git. Do not assume GPU encoding support; verify FFmpeg/NVENC behavior when touching export performance. Preserve the distinction between in-browser preview generation and MP4 export.
