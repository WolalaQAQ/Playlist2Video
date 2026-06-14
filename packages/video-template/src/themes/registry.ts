import type {ComponentType} from 'react';
import type {ThemeId} from '@playlist2video/shared';
import type {PlaylistVideoProps} from '../PlaylistVideo';
import {PlaylistV4Theme} from './playlist-v4/PlaylistV4Theme';

export type ThemeComponent = ComponentType<PlaylistVideoProps>;

const registry: Record<ThemeId, ThemeComponent> = {
  'playlist-v4': PlaylistV4Theme,
};

export const registeredThemeIds = Object.keys(registry) as ThemeId[];
export const getThemeComponent = (themeId: ThemeId): ThemeComponent => registry[themeId];
