import {expect, it} from 'vitest';
import {deriveTitleFromFileName, isSupportedAudioFile} from './audio-file';

it.each(['song.mp3', 'song.FLAC', 'song.wav', 'song.m4a', 'song.aac', 'song.ogg'])('accepts %s', (fileName) => {
  expect(isSupportedAudioFile(fileName)).toBe(true);
});

it.each(['cover.jpg', 'notes.txt', 'video.mp4', 'song.mp3.tmp'])('rejects %s', (fileName) => {
  expect(isSupportedAudioFile(fileName)).toBe(false);
});

it('derives title from filename', () => {
  expect(deriveTitleFromFileName('01 - midnight_drive.mp3')).toBe('01 - midnight drive');
});
