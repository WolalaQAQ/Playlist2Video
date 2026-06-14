import {expect, it} from 'vitest';
import {getThemeComponent, registeredThemeIds} from './registry';

it('registers only playlist-v4 for MVP', () => {
  expect(registeredThemeIds).toEqual(['playlist-v4']);
  expect(getThemeComponent('playlist-v4')).toBeTypeOf('function');
});
