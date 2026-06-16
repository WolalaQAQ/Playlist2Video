## [0.1.10] - 2026-06-16

### Features

- Export now sends the last generated preview project snapshot to the server, so MP4 rendering uses the same playlist order and visual settings shown in the preview.
- Added a Remotion bundle smoke script (`npm run verify:remotion`) for a fast render-template sanity check.

### Fixes

- Removed the export-side spectrum frame-count cap so Remotion export uses the same full-density `spectrumFrames` as the Web preview, eliminating preview/output mismatch.
- Preserved full-density spectrum frames when preparing Remotion input props for export.
- Disabled export while the generated preview is stale after playlist or parameter edits, requiring another Generate video click before exporting.
- Matched the preview shell aspect ratio to the configured export width and height.
- Added a Zod schema to the Remotion composition and renamed the frequency visualizer from the legacy Waveform name.
- Updated audio preview sequences to use `layout="none"`, `premountFor`, and consistent rounded frame boundaries.
- Cleaned export temporary directories by default while preserving an explicit diagnostic option.
- Pinned Remotion package versions used by the project instead of leaving them on `latest`.

### Design Rationale

- The generated preview is treated as the source of truth for export, avoiding silent differences when users edit state after preview generation.
- Spectrum visuals use the same full analyzed data in both Web preview and Remotion export; no export-only spectrum downsampling is applied, so the configurable spectrum FPS quantization behaves identically in preview and export.
- `audioVolumePercent` remains an FFmpeg export-audio setting only, so the Remotion preview audio stays at normal playback volume while exported audio uses the configured mux volume.

### Notes & Caveats

- If a preview is stale, export is intentionally blocked until Generate video refreshes the preview snapshot.
# Changelog

## [0.1.9] - 2026-06-16

### Features

- Added independent `spectrumFps` export setting so the frequency spectrum visualizer can update at a lower rate than the video FPS.
- Added render quality presets, including a new `minimal` mode that suppresses particles, pulse rings, strobe, and flash effects.
- Changed the parameter panel FPS control from a select box to a numeric input and added controls for spectrum FPS and render quality.
- Reduced embedded cover render assets from 900x900 to 768x768 JPEGs to lower per-frame image compositing cost.
- Added a stream-copy FFmpeg final mux path before GPU/CPU re-encode fallback.

### Design Rationale

- Decoupling spectrum FPS keeps the main video timeline smooth while reducing repeated spectrum sampling work in Remotion renders.
- The minimal quality preset targets long/full-HD exports where Chromium per-frame rendering is the bottleneck, not final FFmpeg encoding.
- Stream-copy final mux avoids an unnecessary second video encode when Remotion has already produced a compatible H.264 MP4.

### Notes & Caveats

- Existing project files without `spectrumFps` or `renderQuality` automatically receive defaults of 30 FPS and `high` quality.
- If stream-copy mux fails due container/codec incompatibility, export falls back to the existing GPU encoder detection and CPU `libx264` path.
- Full Remotion export speed is still primarily limited by Chromium rendering of each frame; these changes reduce avoidable visual and mux overhead but do not remove Remotion from the pipeline.

## [0.1.8] - 2026-06-16

### Features

- Added a video bitrate parameter to the Web UI export settings and persisted it in project export config.
- Applied the configured video bitrate to both the Remotion video render stage and the final FFmpeg video encode.

### Fixes

- Fixed parameter panel PATCH validation so saving one theme/export option no longer fills omitted settings with schema defaults and resets the rest of the panel.

### Design Rationale

- Split full config schemas from PATCH schemas because defaults are correct when creating/loading a complete project, but unsafe when validating sparse setting updates.
- Stored video bitrate as integer kbps in shared config so the UI can expose a simple numeric field while render/export code formats it for Remotion and FFmpeg.

### Notes & Caveats

- Existing project files without `videoBitrateKbps` automatically receive the default 12000 kbps value when loaded through the shared project schema.

## [0.1.7] - 2026-06-16

### Features

- Added live FFmpeg terminal output during export so audio concatenation and final video/audio export progress remain visible.
- Added FFmpeg H.264 GPU encoder detection for `h264_nvenc`, `h264_qsv`, and `h264_amf`, including a usability probe before selecting an encoder.
- Added automatic CPU fallback to `libx264` with an explicit terminal warning when no usable GPU encoder is available or when GPU export fails.
- Enabled Remotion's safe hardware acceleration mode for its video render stage.

### Fixes

- Ignored embedded cover-art video streams while concatenating playlist audio so MP3 artwork is not encoded into the intermediate `.m4a`.
- Stabilized Remotion export serving on Windows by using a per-export bundle directory, forcing the internal Remotion server to IPv4 loopback, and reusing one server for composition selection and rendering.
- Disabled Remotion's parallel pre-encoding path for exports to avoid Windows FFmpeg pipe exits during long renders.
- Bounded Remotion render concurrency to one browser worker for long 1080p exports to avoid Chromium target crashes around clustered frame retries.
- Downsampled dense spectrum frame props before Remotion rendering so large real playlists do not push tens of megabytes of JSON through the headless browser startup path.

### Design Rationale

- Used inherited FFmpeg stdio plus `-stats` so users see native FFmpeg progress instead of waiting on a silent child process.
- Probed detected hardware encoders instead of trusting `ffmpeg -encoders`, because listed encoders can still fail when drivers or devices are unavailable.
- Kept fallback inside the export flow so a GPU/driver failure does not abort the whole export.
- Mapped FFmpeg concat to the first audio stream and disabled video streams because many MP3 files expose embedded artwork as a video stream.
- Reused a single Remotion static server for each export so the browser does not have to reconnect to a freshly-started `localhost:3000` server between metadata selection and frame rendering.
- Chose sequential Remotion frame rendering plus a separate final FFmpeg GPU/CPU encode so one FFmpeg path handles final hardware acceleration while avoiding fragile image-pipe pre-encoding.
- Limited Remotion browser concurrency after real-project evidence showed multiple adjacent frames crashing at once under the default multi-worker render behavior.
- Kept enough spectrum frames for reactive visuals while bounding serialized render props; this preserves deterministic preview/export visuals without overloading Remotion page initialization.

### Notes & Caveats

- Final export re-encodes H.264 video when using GPU or CPU fallback, so encoder availability and output speed depend on the installed FFmpeg build and GPU driver.
- If no supported GPU encoder can be initialized, the export automatically uses `libx264` and logs the fallback.
- Full-length 1080p exports can still take several minutes; the API request remains open until rendering and muxing finish.

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
