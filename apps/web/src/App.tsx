import React, {useState} from 'react';
import type {Project} from '@playlist2video/shared';
import {ExportPanel} from './components/ExportPanel';
import {FolderImporter} from './components/FolderImporter';
import {PlaylistEditor} from './components/PlaylistEditor';
import {ThemePanel} from './components/ThemePanel';
import {VideoPreview} from './components/VideoPreview';
import {useProjectStore} from './state/project-store';

function cloneProject(project: Project): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({...track})),
    theme: {...project.theme},
    exportConfig: {...project.exportConfig},
  };
}

export const App: React.FC = () => {
  const store = useProjectStore();
  const [previewProject, setPreviewProject] = useState<Project | null>(null);

  async function handleScan(folderPath: string) {
    setPreviewProject(null);
    await store.scan(folderPath);
  }

  function handleGenerateVideo() {
    if (!store.project) return;
    setPreviewProject(cloneProject(store.project));
  }

  return (
    <div className="app-shell">
      <header><span>Playlist2Video</span><h1>Turn a local music folder into a playlist video.</h1></header>
      <main>
        <div className="left-column">
          <FolderImporter loading={store.loading} onScan={handleScan} />
          {store.error ? <div className="error-box">{store.error}</div> : null}
          {store.warnings.length > 0 ? <div className="warning-box">{store.warnings.join('\n')}</div> : null}
          {store.project ? <PlaylistEditor project={store.project} onReorder={store.reorder} onUpdateTrack={store.updateTrack} /> : null}
        </div>
        <div className="right-column">
          <section className="card generate-panel">
            <div>
              <h2>Generate video</h2>
              <p>扫描和调整顺序后，点击这里刷新右侧预览；不会导出 MP4。</p>
            </div>
            <button disabled={!store.project} onClick={handleGenerateVideo}>Generate video</button>
          </section>
          <VideoPreview project={previewProject} hasEditableProject={Boolean(store.project)} />
          <ThemePanel />
          <ExportPanel project={store.project} />
        </div>
      </main>
    </div>
  );
};
