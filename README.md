# Playlist2Video

Playlist2Video is a local Web UI for turning a folder of audio files into a playlist video.

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
3. Review title, artist, duration, and cover status.
4. Preview the `playlist-v4` theme.
5. Click **Export MP4**.
6. Find the exported file under `output/`.

## MVP Theme

The MVP includes one theme: `playlist-v4`.

It includes:

- Current track cover, title, artist, album, and progress.
- Full playlist panel on the right.
- Highlighting for the current track.
- Full-width bottom realtime frequency spectrum.
- Beat-reactive glow, flashes, pulse rings, particles, and cover shine.

## Verification

```bash
npm run verify
npm run verify:audit
```
