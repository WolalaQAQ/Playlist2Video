# Changelog

## [0.1.1] - 2026-06-15
### Features
- Added mouse drag-and-drop reordering for playlist tracks in the Web UI.
- Added a manual Generate video button that refreshes the Remotion preview only when clicked.
- Kept MP4 export as a separate Export MP4 action.

### Design Rationale
- Decoupled playlist editing from preview generation so large playlists can be reordered without repeatedly rebuilding the preview.
- Preserved the existing export flow to avoid confusing preview generation with rendering an MP4 file to disk.

### Notes & Caveats
- Drag-and-drop saves the new order immediately to the current project, but the right-side preview remains unchanged until Generate video is clicked again.
## [0.1.0] - 2026-06-15
### Features
- Added local Fastify API for scanning audio folders and storing project state.
- Added Vite React Web UI for importing folders, reviewing playlists, previewing video, and triggering export.
- Added shared TypeScript schemas, timeline helpers, and a single-theme registry.
- Added Remotion `playlist-v4` theme with full playlist panel, current-track highlight, bottom spectrum visualizer, and beat-reactive effects.
- Added FFmpeg/Remotion export pipeline for 1080p MP4 output.

### Fixes
- Added browser-safe preview media URLs for scanned audio and extracted covers so Web UI preview can play sound and display embedded artwork.
- Served preview media only from tracks in the current project, avoiding arbitrary local file reads.
- Added HTTP Range support for preview media so audio can resume after seeking in the preview player.
- Replaced decorative fake waveform bars with waveform peaks extracted from the actual audio files during scan.
- Animated the real waveform as a playback-synchronized sliding window with played/playhead highlighting and beat-reactive glow.
- Replaced the bottom time-domain waveform/progress visualization with FFT-derived frequency spectrum bars so the preview behaves like a realtime EQ visualizer.

### Design Rationale
- Used a TypeScript stack to keep UI, server, shared contracts, and Remotion rendering aligned.
- Implemented a data-driven theme registry while shipping only one MVP theme.
- Used lightweight audio energy effects first to avoid advanced beat-detection complexity.
- Precomputed compact spectrum frames during local scanning so browser preview and Remotion export render the same frequency-band visualizer without relying on Web Audio APIs at render time.

### Notes & Caveats
- The MVP is local-only.
- FFmpeg must be installed and available on `PATH`.
- Verified the FFmpeg/Remotion path with generated fixture audio and an MP4 export probe; Remotion render assets are served from the workspace `assets` directory instead of `file://` paths.
- Online playlist import, lyrics, desktop packaging, and additional themes remain future extensions.

