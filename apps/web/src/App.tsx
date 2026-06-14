import React from 'react';
import {ExportPanel} from './components/ExportPanel';
import {FolderImporter} from './components/FolderImporter';
import {PlaylistEditor} from './components/PlaylistEditor';
import {ThemePanel} from './components/ThemePanel';
import {VideoPreview} from './components/VideoPreview';
import {useProjectStore} from './state/project-store';

export const App: React.FC = () => {
  const store = useProjectStore();
  return (
    <div className="app-shell">
      <header><span>Playlist2Video</span><h1>Turn a local music folder into a playlist video.</h1></header>
      <main>
        <div className="left-column">
          <FolderImporter loading={store.loading} onScan={store.scan} />
          {store.error ? <div className="error-box">{store.error}</div> : null}
          {store.warnings.length > 0 ? <div className="warning-box">{store.warnings.join('\n')}</div> : null}
          {store.project ? <PlaylistEditor project={store.project} onReorder={store.reorder} onUpdateTrack={store.updateTrack} /> : null}
        </div>
        <div className="right-column">
          <VideoPreview project={store.project} />
          <ThemePanel />
          <ExportPanel project={store.project} />
        </div>
      </main>
    </div>
  );
};
