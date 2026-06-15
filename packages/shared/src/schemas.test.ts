import {expect, it} from 'vitest';
import {ExportConfigSchema} from './schemas';

it('defaults the export audio bitrate to 320 kbps', () => {
  expect(ExportConfigSchema.parse({}).audioBitrateKbps).toBe(320);
});
