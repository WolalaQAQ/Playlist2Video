# Playlist2Video Local Web UI Design

Date: 2026-06-15

## Summary

Playlist2Video will be a local `localhost` Web UI that converts a folder of local audio files into a polished playlist video. The first version focuses on one strong default theme: a YouTube-style playlist layout with current track information, a full playlist panel on the right, a full-width bottom waveform, and beat-reactive visual effects. The system should reserve a clean theme-selection interface, but only one theme will be implemented in the MVP.

## Goals

- Let the user choose a local audio folder and generate one MP4 playlist video.
- Provide a browser-based UI for reviewing the detected playlist and previewing the video style before export.
- Use a React/Remotion-based video template so visual style can be developed like a frontend component rather than as low-level FFmpeg filters.
- Keep the MVP local-only and practical: no cloud upload, online playlist import, or desktop app packaging yet.
- Preserve an extensible theme interface for future themes without overbuilding the first release.

## Non-Goals

- No Spotify, YouTube Music, NetEase Cloud Music, or other online playlist integration in the MVP.
- No lyrics/subtitle system in the MVP.
- No cloud rendering or hosted service.
- No Electron/Tauri packaging in the MVP.
- No multi-theme marketplace or custom theme editor in the MVP.
- No advanced beat detection in the MVP; use lightweight audio energy/low-frequency analysis first.

## Recommended Technology Stack

### Frontend

- Vite + React + TypeScript for the local Web UI.
- Remotion Player for live video preview inside the browser.
- CSS or Tailwind CSS for UI and theme styling.

### Backend

- Node.js + Fastify for the local API server.
- `music-metadata` for reading audio metadata, duration, and embedded cover art.
- `sharp` for cover extraction, resizing, fallback artwork generation, and blurred background assets.
- Remotion `renderMedia` or equivalent render API for video rendering.
- FFmpeg for audio concatenation, transcoding, and final muxing.

### Data and Storage

- `project.json` stores the detected playlist, ordering, selected theme ID, theme config, and export config.
- `assets/` stores extracted or generated cover images and any intermediate assets.
- `output/` stores exported MP4 files.

## Architecture

```text
apps/web
  Local browser UI
  Playlist review and ordering
  Theme preview and basic configuration
  Export progress display

apps/server
  Local API server
  Folder scan and metadata extraction
  Project persistence
  Render/export orchestration

packages/video-template
  Remotion composition(s)
  Theme registry
  Default v4 playlist theme
  Timeline and current-track rendering logic
  Waveform and beat-reactive effects

packages/shared
  Shared TypeScript types
  Track, Playlist, ThemeConfig, ExportConfig schemas
```

The frontend and backend should share typed data contracts through `packages/shared` so the playlist model, theme config, and export config remain consistent.

## Product Workflow

```text
Start local server
  -> Open localhost Web UI
  -> Select or enter local audio folder path
  -> Server scans supported audio files
  -> Server reads metadata, duration, and cover art
  -> UI displays playlist and detected metadata
  -> User adjusts ordering if needed
  -> User previews video with Remotion Player
  -> User optionally changes basic export settings
  -> User clicks Export
  -> Server renders video and muxes audio
  -> Final MP4 appears in output/
```

## MVP Feature Scope

### Audio Import

- Support local folders containing `.mp3`, `.flac`, `.wav`, `.m4a`, `.aac`, and `.ogg`.
- Sort tracks by filename by default.
- Allow manual reordering in the UI.
- Read `title`, `artist`, `album`, `duration`, and embedded cover art when available.
- Fall back to filename-derived title and generic artist text when metadata is missing.
- Generate fallback cover artwork when embedded cover art is missing.

### Playlist Review UI

- Show all detected tracks.
- Show duration, title, artist, and cover status.
- Allow drag-and-drop reordering.
- Allow basic metadata correction for title and artist if needed.
- Save project state to `project.json`.

### Preview UI

- Show the Remotion Player preview for the selected project.
- Use the default theme.
- Provide basic controls for preview playback and seeking.
- Keep theme selector data-driven, but with one available option in the MVP.

### Export

- Export a 1920x1080, 30fps MP4 by default.
- Concatenate playlist audio in the selected order.
- Render the visual composition using the playlist timeline.
- Mux the rendered video with the concatenated audio.
- Show export progress and final output path.

## Default Theme: `playlist-v4`

The MVP ships a single theme with ID `playlist-v4`.

### Visual Design

- 16:9 video layout.
- Blurred colorful background derived from the current track cover or generated fallback colors.
- Left/main area:
  - Current track index, e.g. `NOW PLAYING · 04 / 18`.
  - Large current track title.
  - Artist and album line.
  - Current track progress bar and elapsed/total time.
  - Large album cover with glow and subtle shine.
- Right panel:
  - Header `FULL PLAYLIST`.
  - Total playlist duration under the header.
  - Track count on the right side of the header.
  - Full playlist items where the currently playing track is highlighted.
- Bottom:
  - Full-width centered waveform/spectrum area.
  - No explanatory technical label in the rendered video.
- Effects:
  - Beat-reactive glow.
  - Background flashes.
  - Pulse rings.
  - Light particles.
  - Cover glow/shine.

### Theme Configuration

The theme should expose a small config object even though only one theme exists initially:

```ts
type ThemeId = 'playlist-v4';

interface ThemeConfig {
  themeId: ThemeId;
  accentColor?: string;
  effectIntensity: 'low' | 'medium' | 'high';
  showParticles: boolean;
  showPulseRings: boolean;
  playlistPanelMode: 'full';
}
```

The UI should present the selected theme as a data-driven option, but it should not include a fake set of unfinished themes. Future themes can be added by registering new theme IDs and components.

## Timeline and Rendering Logic

During scan, the backend computes a timeline:

```text
track[0].start = 0
track[1].start = track[0].duration
track[2].start = track[0].duration + track[1].duration
...
```

At render/preview time:

```text
currentTime = frame / fps
currentTrack = track whose start <= currentTime < end
trackLocalTime = currentTime - currentTrack.start
```

The template uses `currentTrack` to update:

- Cover image.
- Title, artist, album.
- Track progress bar.
- Right-side playlist highlight.
- Background colors and effect inputs.
- Current waveform/spectrum segment.

## Audio Visualization Strategy

The MVP should use lightweight audio analysis compatible with Remotion workflows:

- Use waveform or frequency data from the current audio track where practical.
- Use low-frequency energy and overall volume as the initial driver for glow, flashes, pulse rings, particles, and waveform height.
- Avoid complex beat/onset detection in the MVP because it adds implementation risk and tuning complexity.
- Keep the effect system isolated so a better beat detection implementation can replace the initial driver later.

## Export Pipeline

```text
1. Validate project and audio files.
2. Build concatenated audio file with FFmpeg.
3. Render the Remotion visual composition.
4. Mux rendered video and concatenated audio with FFmpeg.
5. Write final MP4 to output/.
6. Report progress and output path to the UI.
```

The initial implementation should prefer correctness and debuggability over aggressive optimization. Intermediate files can be kept in a temporary work directory during export and cleaned after a successful render.

## Error Handling

- If a folder contains no supported audio files, show a clear UI error.
- If one track fails metadata parsing, include it with fallback metadata rather than failing the whole import.
- If an audio file cannot be decoded by FFmpeg, block export and list the failing file.
- If cover extraction fails, use generated fallback artwork.
- If export fails, preserve logs and show the last meaningful error message in the UI.

## Testing Strategy

- Unit tests for timeline calculation and current-track lookup.
- Unit tests for metadata fallback behavior.
- Unit tests for theme registry and config validation.
- Integration test using a small fixture folder with short audio files.
- Render smoke test for a short playlist segment to verify Remotion and FFmpeg integration.

## Future Extensions

- Additional themes registered through the theme interface.
- More detailed theme controls.
- Desktop packaging with Electron or Tauri.
- Lyrics/subtitle support.
- Online playlist importers.
- Advanced beat/onset detection.
- Per-track custom cover override.
- Export presets for 4K, vertical video, or social clips.

## Open Decisions Resolved

- App shape: local `localhost` Web UI, not pure CLI and not desktop app for MVP.
- Styling/rendering approach: React/Remotion templates, not FFmpeg-only filters.
- Default visual style: approved `playlist-v4` hybrid theme.
- Theme strategy: reserve a data-driven theme interface, but implement only one theme now.
