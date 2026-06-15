# Changelog

## [0.1.6] - 2026-06-16

### Features

- Added readable development terminal logging with aligned `INFO`, `WARN`, and `ERROR` labels, color, and optional Nerd Font icons.
- Added labelled parallel `npm run dev` output for the server and web dev streams.
- Added `PLAYLIST2VIDEO_LOG_ICONS` to force `auto`, `nerd`, `ascii`, or `none` icon modes.

### Design Rationale

- Kept production server logs structured while making local development logs easier to scan.
- Preserved text labels alongside icons so logs remain readable when a terminal cannot render Nerd Font glyphs.
- Forced color for the labelled parallel dev runner because labelled output is piped through `npm-run-all`.

### Notes & Caveats

- Node cannot reliably detect the exact terminal font. If Nerd Font glyphs render incorrectly, use `PLAYLIST2VIDEO_LOG_ICONS=ascii`.

## [0.1.5] - 2026-06-16

### Features

- Added a persistent Web UI parameter adjustment panel for the current project.
- Added controls for visual effect intensity, particles, pulse rings, export resolution, FPS, codec display, and output file name.
- Added FFmpeg audio export controls for audio codec display, bitrate, sample rate, channels, and volume.
- Added `PATCH /api/v1/projects/current/settings` to persist theme and export settings.
- Removed the hard-coded default output description from the export card.

### Design Rationale

- Kept the controls as a right-side card so users can tune parameters while watching the preview area.
- Preserved the manual Generate video workflow: parameter edits save immediately but do not rebuild the Remotion preview until the user clicks Generate video.
- Reused existing shared Zod schemas on the server so UI updates cannot persist unsupported theme/export values.
- Kept audio codec fixed to AAC for MP4 compatibility while exposing the most useful FFmpeg audio knobs.

### Notes & Caveats

- The first panel version exposes settings already represented in project state. Some hard-coded visual constants, such as spectrum bar count and detailed layout dimensions, remain future advanced controls.

## [0.1.4] - 2026-06-16

### Features

- Kept `README.md` as the English README and added a separate `README_zh.md` Chinese README with cross-file language links.
- Added Web UI language switching between Chinese and English.

### Design Rationale

- Kept localization lightweight with a typed frontend translation dictionary instead of adding a full i18n dependency.
- Persisted the selected language in browser local storage so repeat visits keep the user's choice.

### Notes & Caveats

- User-entered project data, scanned metadata, warnings, and backend error messages are displayed as returned and are not machine-translated.

## [0.1.3] - 2026-06-16

### Features

- Linked playlist-v4 visual effects to the active track's real spectrum energy.
- Added low/mid/high frequency energy mapping for cover glow, pulse rings, strobe, flash, and particle sparks.

### Design Rationale

- Used precomputed `spectrumFrames` so Web preview and Remotion export stay deterministic and visually aligned.
- Mapped low frequencies to large pulse motion, mid frequencies to scene/strobe breathing, and high frequencies to spark-like details so energy changes read across the whole frame.
- Kept theme intensity settings as multipliers to preserve existing low/medium/high controls.

### Notes & Caveats

- If a track has no extracted spectrum data, the theme uses a deterministic fallback frame so the preview remains animated.

## [0.1.2] - 2026-06-15

### Features

- Added adaptive current-track title sizing in the playlist video theme.
- Relaxed the current-track title layout with a smaller minimum font size.

### Design Rationale

- Used deterministic title-length estimation instead of DOM measurement so browser preview and Remotion export stay consistent.
- Preserved the existing large title treatment for short names while shrinking only longer titles.
- Avoided ellipsis/clamp replacement so complete song names remain visible.
- Let very long titles reserve their natural layout height so they do not visually overlap the artist metadata below.

### Notes & Caveats

- Extremely long titles may exceed four lines at the minimum font size; in that case the theme shows the full title in the normal layout flow instead of clipping or replacing it with an ellipsis.

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
