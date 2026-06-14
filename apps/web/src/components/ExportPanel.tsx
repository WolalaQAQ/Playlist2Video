import React, {useState} from 'react';
import type {Project} from '@playlist2video/shared';
import {exportCurrentProject} from '../api/client';

export const ExportPanel: React.FC<{project: Project | null}> = ({project}) => {
  const [exporting, setExporting] = useState(false);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      setOutputPath((await exportCurrentProject()).outputPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="card">
      <h2>Export</h2>
      <p>Default output: 1920x1080, 30fps, MP4.</p>
      <button disabled={!project || exporting} onClick={handleExport}>{exporting ? 'Exporting...' : 'Export MP4'}</button>
      {outputPath ? <p>Exported to {outputPath}</p> : null}
      {error ? <p className="inline-error">{error}</p> : null}
    </section>
  );
};
