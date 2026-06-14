import {describe, expect, it} from 'vitest';
import {buildTimeline, findTrackAtTime, getTotalDuration} from './timeline';
import type {Track} from './schemas';

const tracks: Track[] = [
  {id: 'track-1', sourcePath: 'C:/Music/01.mp3', title: 'Intro', artist: 'A', album: null, durationSeconds: 10, coverPath: null, order: 0},
  {id: 'track-2', sourcePath: 'C:/Music/02.mp3', title: 'Main', artist: 'B', album: 'Album', durationSeconds: 20, coverPath: 'assets/2.jpg', order: 1},
];

describe('timeline', () => {
  it('builds start and end times', () => {
    expect(buildTimeline(tracks)).toEqual([
      {...tracks[0], startSeconds: 0, endSeconds: 10},
      {...tracks[1], startSeconds: 10, endSeconds: 30},
    ]);
  });

  it('finds current track by time', () => {
    const timeline = buildTimeline(tracks);
    expect(findTrackAtTime(timeline, 0)?.id).toBe('track-1');
    expect(findTrackAtTime(timeline, 9.99)?.id).toBe('track-1');
    expect(findTrackAtTime(timeline, 10)?.id).toBe('track-2');
    expect(findTrackAtTime(timeline, 30)?.id).toBe('track-2');
  });

  it('gets total duration', () => {
    expect(getTotalDuration(buildTimeline(tracks))).toBe(30);
  });
});
