import {expect, it} from 'vitest';
import {defaultThemeConfig, themeOptions} from './theme';

it('exposes only playlist-v4 for MVP', () => {
  expect(themeOptions).toEqual([
    {id: 'playlist-v4', name: 'Playlist V4', description: 'YouTube-style playlist layout with realtime spectrum and beat-reactive effects'},
  ]);
});

it('uses playlist-v4 defaults', () => {
  expect(defaultThemeConfig).toEqual({
    themeId: 'playlist-v4',
    effectIntensity: 'high',
    showParticles: true,
    showPulseRings: true,
    playlistPanelMode: 'full',
  });
});
