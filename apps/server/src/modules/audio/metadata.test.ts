import {describe, expect, it} from 'vitest';
import {buildTrackFromMetadata} from './metadata';

describe('buildTrackFromMetadata', () => {
  it('uses metadata when available', () => {
    const track = buildTrackFromMetadata({
      filePath: 'C:/Music/01.mp3',
      order: 0,
      durationSeconds: 123,
      metadata: {common: {title: 'Song Title', artist: 'Artist Name', album: 'Album Name'}, format: {}},
      coverPath: 'assets/cover.jpg',
    });

    expect(track).toMatchObject({
      title: 'Song Title',
      artist: 'Artist Name',
      album: 'Album Name',
      durationSeconds: 123,
      coverPath: 'assets/cover.jpg',
      order: 0,
    });
    expect(track.id).toMatch(/^track-/);
  });

  it('falls back when metadata is missing', () => {
    const track = buildTrackFromMetadata({
      filePath: 'C:/Music/02 - test_song.mp3',
      order: 1,
      durationSeconds: 90,
      metadata: {common: {}, format: {}},
      coverPath: null,
    });

    expect(track.title).toBe('02 - test song');
    expect(track.artist).toBe('Unknown Artist');
    expect(track.album).toBeNull();
    expect(track.coverPath).toBeNull();
  });
});
