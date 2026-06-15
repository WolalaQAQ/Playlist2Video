# Terminal Log Format Design

## Goal

Improve local development terminal output for Playlist2Video so `npm run dev` is readable at a glance, with clear `INFO`, `WARN`, and `ERROR` level tags, color, and optional Nerd Font icons.

## Scope

- Replace Fastify's development JSON logs with a human-readable terminal formatter.
- Keep production logs structured for machines.
- Keep test logs quiet.
- Prefix concurrent `server` and `web` development output when running `npm run dev`.
- Provide an ASCII fallback for environments that cannot render Nerd Font glyphs.

## Design

Server logging is configured through a small logger module. `buildApp()` consumes that module instead of hard-coding `logger: true`. The module returns:

- `false` for tests, preventing noisy test output.
- Structured Pino/Fastify logging for production.
- A development Pino stream that receives JSON records, parses them, and prints aligned terminal lines.

The terminal formatter always includes text labels such as `INFO`, `WARN`, and `ERROR`, so logs remain readable even if icons fail to render. Icon mode defaults to automatic: interactive non-CI terminals get Nerd Font icons; CI, dumb terminals, or explicit `PLAYLIST2VIDEO_LOG_ICONS=ascii` use ASCII. Users can force modes with `PLAYLIST2VIDEO_LOG_ICONS=nerd`, `ascii`, or `none`.

Root development scripts use `cross-env FORCE_COLOR=1 npm-run-all --print-label --parallel dev:server dev:web` so the server and Vite streams are labelled without losing colors under piped output.

## Testing

- Unit tests cover logger option selection for `test`, `development`, and `production`.
- Unit tests cover formatted `INFO`, `WARN`, and `ERROR` output, request completion formatting, and Nerd/ASCII icon resolution.
- A package script test verifies `npm run dev` keeps forced color and labelled parallel output.

## Notes

Node cannot reliably detect the user's exact terminal font. The practical fallback is environment-based plus persistent text labels. If a terminal displays Nerd icons as missing glyphs, set `PLAYLIST2VIDEO_LOG_ICONS=ascii`.
