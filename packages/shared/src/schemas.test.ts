import {expect, it} from 'vitest';
import {ExportConfigSchema, ThemeConfigSchema} from './schemas';

it('defaults the export audio bitrate to 320 kbps', () => {
  expect(ExportConfigSchema.parse({}).audioBitrateKbps).toBe(320);
});

it('defaults the export video bitrate to 12000 kbps', () => {
  expect(ExportConfigSchema.parse({}).videoBitrateKbps).toBe(12000);
});

it('defaults spectrum rendering to full-rate high quality for compatibility', () => {
  expect(ExportConfigSchema.parse({})).toMatchObject({
    spectrumFps: 30,
    renderQuality: 'high',
  });
});

it('defaults Remotion intermediate frames to JPEG 100 for cleaner exports', () => {
  expect(ExportConfigSchema.parse({})).toMatchObject({
    frameImageFormat: 'jpeg',
    jpegQuality: 100,
  });
});

it('allows PNG intermediate frames and validates JPEG quality bounds', () => {
  expect(ExportConfigSchema.parse({frameImageFormat: 'png', jpegQuality: 90})).toMatchObject({
    frameImageFormat: 'png',
    jpegQuality: 90,
  });
  expect(() => ExportConfigSchema.parse({jpegQuality: 101})).toThrow();
});

it('allows a minimal visual effect intensity preset', () => {
  expect(ThemeConfigSchema.parse({themeId: 'playlist-v4', effectIntensity: 'minimal'}).effectIntensity).toBe('minimal');
});
