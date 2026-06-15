import {useCallback, useState} from 'react';
import type {ExportConfig, Project, ThemeConfig} from '@playlist2video/shared';
import * as client from '../api/client';

export function useProjectStore() {
  const [project, setProject] = useState<Project | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const scan = useCallback(async (folderPath: string): Promise<Project | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.scanFolder(folderPath);
      setProject(result.project);
      setWarnings(result.warnings);
      return result.project;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reorder = useCallback(async (trackIds: string[]) => {
    const updatedProject = await client.reorderTracks(trackIds);
    setProject(updatedProject);
    return updatedProject;
  }, []);

  const updateTrack = useCallback(async (input: {trackId: string; title: string; artist: string}) => {
    const updatedProject = await client.updateTrackMetadata(input);
    setProject(updatedProject);
    return updatedProject;
  }, []);

  const updateSettings = useCallback(async (input: {theme?: Partial<ThemeConfig>; exportConfig?: Partial<ExportConfig>}) => {
    const updatedProject = await client.updateProjectSettings(input);
    setProject(updatedProject);
    return updatedProject;
  }, []);

  return {project, warnings, error, loading, scan, reorder, updateTrack, updateSettings};
}
