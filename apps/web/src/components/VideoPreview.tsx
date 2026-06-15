import React from 'react';
import {Player} from '@remotion/player';
import {buildTimeline, getTotalDuration, type Project} from '@playlist2video/shared';
import {PlaylistVideo} from '@playlist2video/video-template';
import type {Translation} from '../i18n';

export const VideoPreview: React.FC<{
  copy: Translation['preview'];
  project: Project | null;
  hasEditableProject?: boolean;
}> = ({copy, project, hasEditableProject = false}) => {
  if (!project) {
    return <section className="card preview-empty">{hasEditableProject ? copy.emptyWithProject : copy.emptyWithoutProject}</section>;
  }
  const durationInFrames = Math.max(1, Math.ceil(getTotalDuration(buildTimeline(project.tracks)) * project.exportConfig.fps));
  return (
    <section className="card preview-card">
      <h2>{copy.title}</h2>
      <Player component={PlaylistVideo} inputProps={{project}} durationInFrames={durationInFrames} compositionWidth={project.exportConfig.width} compositionHeight={project.exportConfig.height} fps={project.exportConfig.fps} controls style={{width: '100%', aspectRatio: '16 / 9'}} />
    </section>
  );
};
