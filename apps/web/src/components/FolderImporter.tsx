import React, {useState} from 'react';
import type {Translation} from '../i18n';

export const FolderImporter: React.FC<{
  copy: Translation['folderImporter'];
  loading: boolean;
  onScan: (folderPath: string) => void;
}> = ({copy, loading, onScan}) => {
  const [folderPath, setFolderPath] = useState('');
  return (
    <section className="card">
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
      <form onSubmit={(event) => { event.preventDefault(); onScan(folderPath); }}>
        <input value={folderPath} onChange={(event) => setFolderPath(event.target.value)} placeholder={copy.placeholder} />
        <button disabled={loading || folderPath.trim().length === 0}>{loading ? copy.scanningButton : copy.scanButton}</button>
      </form>
    </section>
  );
};
