import React, {useState} from 'react';
import type {Project} from '@playlist2video/shared';
import {exportCurrentProject} from '../api/client';
import type {Translation} from '../i18n';

export const ExportPanel: React.FC<{copy: Translation['exportPanel']; project: Project | null}> = ({copy, project}) => {
  const [exporting, setExporting] = useState(false);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      setOutputPath((await exportCurrentProject()).outputPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.fallbackError);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="card">
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
      <button disabled={!project || exporting} onClick={handleExport}>{exporting ? copy.exportingButton : copy.button}</button>
      {outputPath ? <p>{copy.exportedTo(outputPath)}</p> : null}
      {error ? <p className="inline-error">{error}</p> : null}
    </section>
  );
};
