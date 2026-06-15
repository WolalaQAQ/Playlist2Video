import {z} from 'zod';

export const supportedAudioExtensions = ['.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg'] as const;

export const TrackSchema = z.object({
  id: z.string().min(1),
  sourcePath: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().nullable(),
  durationSeconds: z.number().positive(),
  coverPath: z.string().nullable(),
  renderCoverPath: z.string().nullable().optional(),
  audioPreviewUrl: z.string().nullable().optional(),
  coverPreviewUrl: z.string().nullable().optional(),
  waveformPeaks: z.array(z.number().min(0).max(1)).optional(),
  spectrumFrames: z.array(z.array(z.number().min(0).max(1))).optional(),
  order: z.number().int().nonnegative(),
});

export const TimelineTrackSchema = TrackSchema.extend({
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
});

export const ThemeConfigSchema = z.object({
  themeId: z.literal('playlist-v4'),
  accentColor: z.string().optional(),
  effectIntensity: z.enum(['low', 'medium', 'high']).default('high'),
  showParticles: z.boolean().default(true),
  showPulseRings: z.boolean().default(true),
  playlistPanelMode: z.literal('full').default('full'),
});

export const ExportConfigSchema = z.object({
  width: z.number().int().positive().default(1920),
  height: z.number().int().positive().default(1080),
  fps: z.number().int().positive().default(30),
  videoCodec: z.literal('h264').default('h264'),
  outputFileName: z.string().min(1).default('playlist-video.mp4'),
  audioCodec: z.literal('aac').default('aac'),
  audioBitrateKbps: z.number().int().positive().default(320),
  audioSampleRate: z.union([z.literal(44100), z.literal(48000)]).default(48000),
  audioChannels: z.union([z.literal(1), z.literal(2)]).default(2),
  audioVolumePercent: z.number().int().min(1).max(200).default(100),
});

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceFolder: z.string().min(1),
  tracks: z.array(TrackSchema),
  theme: ThemeConfigSchema,
  exportConfig: ExportConfigSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Track = z.infer<typeof TrackSchema>;
export type TimelineTrack = z.infer<typeof TimelineTrackSchema>;
export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;
export type ExportConfig = z.infer<typeof ExportConfigSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type SupportedAudioExtension = (typeof supportedAudioExtensions)[number];

