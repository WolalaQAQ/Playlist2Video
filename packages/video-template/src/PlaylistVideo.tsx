import React from 'react';
import type {Project} from '@playlist2video/shared';
import {getThemeComponent} from './themes/registry';

export interface PlaylistVideoProps extends Record<string, unknown> {
  project: Project;
}

export const PlaylistVideo: React.FC<PlaylistVideoProps> = (props) => {
  const Theme = getThemeComponent(props.project.theme.themeId);
  return <Theme {...props} />;
};
