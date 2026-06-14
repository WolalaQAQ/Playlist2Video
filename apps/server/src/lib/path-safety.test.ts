import path from 'node:path';
import {expect, it} from 'vitest';
import {assertSafeLocalPath, resolveInside} from './path-safety';

it('rejects empty paths', () => {
  expect(() => assertSafeLocalPath('')).toThrow('Path is required');
});

it('rejects null bytes', () => {
  expect(() => assertSafeLocalPath('C:/Music\0evil')).toThrow('Path contains invalid characters');
});

it('keeps output paths inside a root', () => {
  const root = path.resolve('output');
  expect(resolveInside(root, 'video.mp4')).toBe(path.join(root, 'video.mp4'));
  expect(() => resolveInside(root, '../escape.mp4')).toThrow('Resolved path escapes project root');
});
