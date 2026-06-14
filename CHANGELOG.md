# Changelog

## [0.1.0] - 2026-06-15
### Features
- Added local Fastify API for scanning audio folders and storing project state.
- Added Vite React Web UI for importing folders, reviewing playlists, previewing video, and triggering export.
- Added shared TypeScript schemas, timeline helpers, and a single-theme registry.
- Added Remotion `playlist-v4` theme with full playlist panel, current-track highlight, bottom waveform, and beat-reactive effects.
- Added FFmpeg/Remotion export pipeline for 1080p MP4 output.

### Design Rationale
- Used a TypeScript stack to keep UI, server, shared contracts, and Remotion rendering aligned.
- Implemented a data-driven theme registry while shipping only one MVP theme.
- Used lightweight audio energy effects first to avoid advanced beat-detection complexity.

### Notes & Caveats
- The MVP is local-only.
- FFmpeg must be installed and available on `PATH`.
- Online playlist import, lyrics, desktop packaging, and additional themes remain future extensions.
