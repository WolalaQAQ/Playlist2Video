import React from 'react';
import {Player} from '@remotion/player';
import {buildTimeline, getTotalDuration, type Project} from '@playlist2video/shared';
import {PlaylistVideo} from '@playlist2video/video-template';

export const VideoPreview: React.FC<{project: Project | null; hasEditableProject?: boolean}> = ({project, hasEditableProject = false}) => {
  if (!project) {
    return <section className="card preview-empty">{hasEditableProject ? 'Click Generate video to build the preview.' : 'Scan a folder to prepare a playlist.'}</section>;
  }
  const durationInFrames = Math.max(1, Math.ceil(getTotalDuration(buildTimeline(project.tracks)) * project.exportConfig.fps));
  return (
    <section className="card preview-card">
      <h2>Preview</h2>
      <Player component={PlaylistVideo} inputProps={{project}} durationInFrames={durationInFrames} compositionWidth={project.exportConfig.width} compositionHeight={project.exportConfig.height} fps={project.exportConfig.fps} controls style={{width: '100%', aspectRatio: '16 / 9'}} />
    </section>
  );
};
