import React from 'react';
import {Composition, type CalculateMetadataFunction} from 'remotion';
import {buildTimeline, getTotalDuration, ProjectSchema} from '@playlist2video/shared';
import {z} from 'zod';
import {PlaylistVideo, type PlaylistVideoProps} from './PlaylistVideo';

const defaultFps = 30;
export const PlaylistVideoSchema = z.object({
  project: ProjectSchema,
  renderMode: z.enum(['video', 'static-image']).optional(),
  stillTrackId: z.string().optional(),
});

const calculateMetadata: CalculateMetadataFunction<PlaylistVideoProps> = ({props}) => {
  const fps = props.project.exportConfig.fps;

  return {
    durationInFrames: Math.max(1, Math.ceil(getTotalDuration(buildTimeline(props.project.tracks)) * fps)),
    fps,
    width: props.project.exportConfig.width,
    height: props.project.exportConfig.height,
    props,
  };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="PlaylistVideo"
    component={PlaylistVideo}
    durationInFrames={30}
    fps={defaultFps}
    width={1920}
    height={1080}
    defaultProps={{
      project: {
        id: 'preview-project',
        name: 'Preview',
        sourceFolder: '',
        tracks: [],
        theme: {themeId: 'playlist-v4', effectIntensity: 'high', showParticles: true, showPulseRings: true, playlistPanelMode: 'full'},
        exportConfig: {width: 1920, height: 1080, fps: 30, videoCodec: 'h264', videoBitrateKbps: 12000, spectrumFps: 30, renderQuality: 'high', frameImageFormat: 'jpeg', jpegQuality: 100, outputFileName: 'playlist-video.mp4', audioCodec: 'aac', audioBitrateKbps: 320, audioSampleRate: 48000, audioChannels: 2, audioVolumePercent: 100},
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
    }}
    calculateMetadata={calculateMetadata}
    schema={PlaylistVideoSchema}
  />
);
