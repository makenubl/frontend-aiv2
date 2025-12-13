import React, { useEffect, useState } from 'react';
import { storageApi } from '../services/api';
import StorageChat from './StorageChat';

interface RecommendationItem {
  id: string;
  point: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
}

interface TrailEntry {
  applicationId: string;
  documentName: string;
  version: number;
  recommendations: RecommendationItem[];
  createdAt?: string;
  updatedAt?: string;
}

const StorageManager: React.FC = () => {
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>('');
  const [selection, setSelection] = useState<Record<string, Record<string, boolean>>>({});

  const refreshFolders = async () => {
    const { data } = await storageApi.listFolders();
    setFolders(data.folders || []);
  };

  const refreshTrail = async () => {
    if (!selectedFolder) return;
    const { data } = await storageApi.listRecommendations(selectedFolder, selectedDoc || undefined);
    setTrail(data.trail || []);
  };

  useEffect(() => {
    refreshFolders();
  }, []);

  useEffect(() => {
    refreshTrail();
  }, [selectedFolder, selectedDoc]);

  const onCreateFolder = async () => {
    const name = prompt('Folder name');
    if (!name) return;
    await storageApi.createFolder(name);
    await refreshFolders();
    setSelectedFolder(name);
  };

  const onUpload = async () => {
    if (!selectedFolder || !filesToUpload.length) return;
    await storageApi.uploadToFolder(selectedFolder, filesToUpload);
    setFilesToUpload([]);
    await refreshTrail();
  };

  const onAcceptReject = async (entry: TrailEntry) => {
    const key = `${entry.documentName}:${entry.version}`;
    const selected = selection[key] || {};
    const chosenIds = Object.keys(selected).filter(id => selected[id]);
    const pendingIds = entry.recommendations.filter(r => r.status === 'pending').map(r => r.id);
    const effectiveIds = chosenIds.length ? chosenIds : pendingIds;
    const toAccept = effectiveIds;
    const toReject: string[] = [];
    await storageApi.decideRecommendations(entry.applicationId, entry.documentName, entry.version, toAccept, toReject);
    await refreshTrail();
    setSelection(prev => ({ ...prev, [key]: {} }));
  };

  const onRejectSelected = async (entry: TrailEntry) => {
    const key = `${entry.documentName}:${entry.version}`;
    const selected = selection[key] || {};
    const chosenIds = Object.keys(selected).filter(id => selected[id]);
    if (!chosenIds.length) return;
    await storageApi.decideRecommendations(entry.applicationId, entry.documentName, entry.version, [], chosenIds);
    await refreshTrail();
    setSelection(prev => ({ ...prev, [key]: {} }));
  };

  const toggleSelect = (entry: TrailEntry, recId: string) => {
    const key = `${entry.documentName}:${entry.version}`;
    setSelection(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [recId]: !(prev[key]?.[recId]) }
    }));
  };

  return (
    <div style={{ padding: 16 }}>
      <h3>Storage Manager</h3>

      <div style={{ marginBottom: 12 }}>
        <button onClick={onCreateFolder}>Create Folder</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>
          Select Folder:&nbsp;
          <select value={selectedFolder} onChange={(e) => setSelectedFolder(e.target.value)}>
            <option value="">-- choose --</option>
            {folders.map(f => (<option key={f} value={f}>{f}</option>))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>
          Filter by Document:&nbsp;
          <input value={selectedDoc} onChange={(e) => setSelectedDoc(e.target.value)} placeholder="filename.ext" />
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <input type="file" multiple onChange={(e) => setFilesToUpload(Array.from(e.target.files || []))} />
        <button disabled={!selectedFolder || !filesToUpload.length} onClick={onUpload}>Upload</button>
      </div>

      <div>
        <h4>Recommendations Trail</h4>
        {!trail.length && <div>No recommendations yet</div>}
        {trail.map((t) => (
          <div key={`${t.documentName}-${t.version}`} style={{ border: '1px solid #ddd', padding: 8, marginBottom: 8 }}>
            <div><strong>Document:</strong> {t.documentName} &nbsp; <strong>Version:</strong> {t.version}</div>
            <ul>
              {t.recommendations.map(r => (
                <li key={r.id}>
                  <input type="checkbox" style={{ marginRight: 8 }} checked={!!selection[`${t.documentName}:${t.version}`]?.[r.id]} onChange={() => toggleSelect(t, r.id)} />
                  [{r.status}] {r.point}
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onAcceptReject(t)}>Accept Selected (or all pending)</button>
              <button onClick={() => onRejectSelected(t)}>Reject Selected</button>
            </div>
          </div>
        ))}
      </div>
      {selectedFolder && <StorageChat folder={selectedFolder} document={selectedDoc} />}
    </div>
  );
};

export default StorageManager;
