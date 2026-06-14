import type {ThemeConfig} from './schemas';

export type ThemeId = 'playlist-v4';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
}

export const themeOptions: ThemeOption[] = [
  {id: 'playlist-v4', name: 'Playlist V4', description: 'YouTube-style playlist layout with realtime spectrum and beat-reactive effects'},
];

export const defaultThemeConfig: ThemeConfig = {
  themeId: 'playlist-v4',
  effectIntensity: 'high',
  showParticles: true,
  showPulseRings: true,
  playlistPanelMode: 'full',
};
