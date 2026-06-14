import {useCallback, useState} from 'react';
import type {Project} from '@playlist2video/shared';
import * as client from '../api/client';

export function useProjectStore() {
  const [project, setProject] = useState<Project | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const scan = useCallback(async (folderPath: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.scanFolder(folderPath);
      setProject(result.project);
      setWarnings(result.warnings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const reorder = useCallback(async (trackIds: string[]) => setProject(await client.reorderTracks(trackIds)), []);
  const updateTrack = useCallback(async (input: {trackId: string; title: string; artist: string}) => setProject(await client.updateTrackMetadata(input)), []);
  return {project, warnings, error, loading, scan, reorder, updateTrack};
}
