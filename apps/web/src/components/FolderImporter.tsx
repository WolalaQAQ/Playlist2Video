import React, {useState} from 'react';

export const FolderImporter: React.FC<{loading: boolean; onScan: (folderPath: string) => void}> = ({loading, onScan}) => {
  const [folderPath, setFolderPath] = useState('');
  return (
    <section className="card">
      <h2>Import local audio folder</h2>
      <p>Enter a local folder path containing MP3, FLAC, WAV, M4A, AAC, or OGG files.</p>
      <form onSubmit={(event) => { event.preventDefault(); onScan(folderPath); }}>
        <input value={folderPath} onChange={(event) => setFolderPath(event.target.value)} placeholder="C:\\Users\\You\\Music\\Playlist" />
        <button disabled={loading || folderPath.trim().length === 0}>{loading ? 'Scanning...' : 'Scan folder'}</button>
      </form>
    </section>
  );
};
