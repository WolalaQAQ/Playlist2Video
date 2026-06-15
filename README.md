# Playlist2Video

**Language:** English | [中文](README_zh.md)

Playlist2Video is a local Web UI for turning a folder of audio files into a Remotion-powered playlist video.

It scans local audio folders, extracts metadata and artwork, lets you reorder tracks with mouse drag-and-drop, generates an in-browser preview on demand, and exports a 1080p MP4 when you are ready.

## Requirements

- Node.js 24+
- npm 11+
- FFmpeg available on `PATH`

## Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

Development terminal output is formatted for readability. Server logs use aligned
`INFO`, `WARN`, and `ERROR` labels with color, and `npm run dev` labels the
parallel `dev:server` and `dev:web` streams. Interactive terminals use Nerd Font
icons by default; set `PLAYLIST2VIDEO_LOG_ICONS=ascii` if your terminal font
cannot display them. Supported values are `auto`, `nerd`, `ascii`, and `none`.

## Workflow

1. Enter a local folder path containing `.mp3`, `.flac`, `.wav`, `.m4a`, `.aac`, or `.ogg`.
2. Click **Scan folder**.
3. Review and edit title, artist, duration, and cover status.
4. Drag the handle on the left of each track to adjust playlist order.
5. Tune the **Parameter controls** panel for visual effects and export settings.
6. Click **Generate video** to refresh the right-side Remotion preview when you are ready.
7. Click **Export MP4** to render the final file.
8. Find the exported file under `output/`.

Scanning, reordering, and parameter edits do not automatically regenerate the preview. This keeps large playlists responsive while you adjust the project.

## Parameter Controls

The Web UI includes a persistent right-side panel for settings saved to the current project:

- Visual effect intensity: low, medium, or high.
- Particle and pulse-ring effect toggles.
- Export width, height, FPS, codec display, and output file name.
- FFmpeg audio export settings: codec display, bitrate, sample rate, channels, and volume.

After changing parameters, click **Generate video** to rebuild the browser preview with the saved settings.

## MVP Theme

The MVP includes one theme: `playlist-v4`.

It includes:

- Current track cover, title, artist, album, and progress.
- Full playlist panel on the right.
- Highlighting for the current track.
- Full-width bottom realtime frequency spectrum.
- Beat-reactive glow, flashes, pulse rings, particles, and cover shine.

## Multilingual Web UI

The Web UI header includes a language switcher for Chinese and English. The selected language is saved in browser local storage.

## Verification

```bash
npm run verify
npm run verify:audit
```
