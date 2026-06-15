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

## Workflow

1. Enter a local folder path containing `.mp3`, `.flac`, `.wav`, `.m4a`, `.aac`, or `.ogg`.
2. Click **Scan folder**.
3. Review and edit title, artist, duration, and cover status.
4. Drag the handle on the left of each track to adjust playlist order.
5. Click **Generate video** to refresh the right-side Remotion preview when you are ready.
6. Click **Export MP4** to render the final file.
7. Find the exported file under `output/`.

Scanning and reordering do not automatically regenerate the preview. This keeps large playlists responsive while you adjust the order.

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