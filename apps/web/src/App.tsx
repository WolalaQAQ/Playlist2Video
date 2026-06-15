import React, {useEffect, useMemo, useState} from 'react';
import type {Project} from '@playlist2video/shared';
import {ExportPanel} from './components/ExportPanel';
import {FolderImporter} from './components/FolderImporter';
import {PlaylistEditor} from './components/PlaylistEditor';
import {ThemePanel} from './components/ThemePanel';
import {VideoPreview} from './components/VideoPreview';
import {getInitialLanguage, languageStorageKey, type Language, translations} from './i18n';
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
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const copy = translations[language];
  const nextLanguage = useMemo<Language>(() => (language === 'zh' ? 'en' : 'zh'), [language]);

  useEffect(() => {
    document.documentElement.lang = copy.htmlLang;
    try {
      window.localStorage.setItem(languageStorageKey, language);
    } catch {
      // Ignore storage errors so the language switch still works in private or restricted contexts.
    }
  }, [copy.htmlLang, language]);

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
      <header>
        <div className="topbar">
          <span>{copy.appTag}</span>
          <button
            className="language-toggle"
            onClick={() => setLanguage(nextLanguage)}
            type="button"
          >
            {copy.switchLanguage}
          </button>
        </div>
        <h1>{copy.appTitle}</h1>
      </header>
      <main>
        <div className="left-column">
          <FolderImporter copy={copy.folderImporter} loading={store.loading} onScan={handleScan} />
          {store.error ? <div className="error-box">{store.error}</div> : null}
          {store.warnings.length > 0 ? <div className="warning-box">{store.warnings.join('\n')}</div> : null}
          {store.project ? <PlaylistEditor copy={copy.playlist} project={store.project} onReorder={store.reorder} onUpdateTrack={store.updateTrack} /> : null}
        </div>
        <div className="right-column">
          <section className="card generate-panel">
            <div>
              <h2>{copy.generate.title}</h2>
              <p>{copy.generate.description}</p>
            </div>
            <button disabled={!store.project} onClick={handleGenerateVideo}>{copy.generate.button}</button>
          </section>
          <VideoPreview copy={copy.preview} project={previewProject} hasEditableProject={Boolean(store.project)} />
          <ThemePanel copy={copy.theme} />
          <ExportPanel copy={copy.exportPanel} project={store.project} />
        </div>
      </main>
    </div>
  );
};
