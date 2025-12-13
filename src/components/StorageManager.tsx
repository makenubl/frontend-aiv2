import React, { useEffect, useRef, useState } from 'react';
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
  documentName: string;
  version: number;
  recommendations: RecommendationItem[];
  createdAt?: string;
  updatedAt?: string;
}

const shell: React.CSSProperties = {
  padding: 24,
  display: 'grid',
  gap: 16,
  background: '#0f172a',
  color: '#e2e8f0',
  maxWidth: 1400,
  margin: '0 auto',
  width: '100%',
  boxSizing: 'border-box'
};

const card: React.CSSProperties = {
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: 12,
  padding: 14,
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  minHeight: 120
};

const subCard: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 10,
  padding: 12
};

const label: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  color: '#94a3b8',
  letterSpacing: 0.5,
  marginBottom: 6
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 10,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e2e8f0'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 10,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e2e8f0'
};

const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
  color: 'white',
  border: 'none',
  padding: '10px 14px',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 600
};

const secondaryBtn: React.CSSProperties = {
  background: '#1f2937',
  color: '#e2e8f0',
  border: '1px solid #374151',
  padding: '10px 14px',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 600
};

const dangerBtn: React.CSSProperties = {
  background: '#ef4444',
  color: 'white',
  border: 'none',
  padding: '10px 14px',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 600
};

const statusColor: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#22c55e',
  rejected: '#ef4444'
};

const StorageManager: React.FC = () => {
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [selection, setSelection] = useState<Record<string, Record<string, boolean>>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const [uploading, setUploading] = useState(false);

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
    if (!selectedFolder) {
      setTrail([]);
      return;
    }
    refreshTrail().then(() => {
      // Scroll to top of component smoothly when folder changes
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [selectedFolder, selectedDoc]);

  const onCreateFolder = async () => {
    const name = window.prompt('Folder name');
    if (!name) return;
    try {
      await storageApi.createFolder(name);
      await refreshFolders();
      setSelectedFolder(name);
      window.alert('Folder created');
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to create folder';
      console.error('Create folder error:', e);
      window.alert(errorMsg);
    }
  };

  const onDeleteFolder = async () => {
    if (!selectedFolder) return;
    const ok = window.confirm(`Delete folder "${selectedFolder}" and its contents?`);
    if (!ok) return;
    try {
      await storageApi.deleteFolder(selectedFolder);
      setSelectedFolder('');
      setTrail([]);
      await refreshFolders();
      window.alert('Folder deleted');
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to delete folder';
      console.error('Delete error:', e);
      window.alert(errorMsg);
    }
  };

  const onUpload = async () => {
    if (!selectedFolder || !filesToUpload.length) {
      console.warn('Upload blocked: folder or files missing', { selectedFolder, fileCount: filesToUpload.length });
      return;
    }
    console.log('Starting upload:', { folder: selectedFolder, files: filesToUpload.map(f => f.name) });
    try {
      setUploading(true);
      const response = await storageApi.uploadToFolder(selectedFolder, filesToUpload);
      console.log('Upload response:', response.data);
      setFilesToUpload([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshTrail();
      const message = response.data?.message || 'Upload complete';
      window.alert(message);
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Upload failed';
      console.error('Upload error:', e);
      window.alert(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const onAcceptReject = async (entry: TrailEntry) => {
    const key = `${entry.documentName}:${entry.version}`;
    const selected = selection[key] || {};
    const chosenIds = Object.keys(selected).filter(id => selected[id]);
    const pendingIds = entry.recommendations.filter(r => r.status === 'pending').map(r => r.id);
    const effectiveIds = chosenIds.length ? chosenIds : pendingIds;
    if (!effectiveIds.length) return;
    try {
      await storageApi.decideRecommendations(selectedFolder, entry.documentName, entry.version, effectiveIds, []);
      await refreshTrail();
      setSelection(prev => ({ ...prev, [key]: {} }));
      window.alert('Recommendations accepted');
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to accept recommendations';
      console.error('Accept error:', e);
      window.alert(errorMsg);
    }
  };

  const onRejectSelected = async (entry: TrailEntry) => {
    const key = `${entry.documentName}:${entry.version}`;
    const selected = selection[key] || {};
    const chosenIds = Object.keys(selected).filter(id => selected[id]);
    if (!chosenIds.length) return;
    try {
      await storageApi.decideRecommendations(selectedFolder, entry.documentName, entry.version, [], chosenIds);
      await refreshTrail();
      setSelection(prev => ({ ...prev, [key]: {} }));
      window.alert('Recommendations rejected');
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to reject recommendations';
      console.error('Reject error:', e);
      window.alert(errorMsg);
    }
  };

  const toggleSelect = (entry: TrailEntry, recId: string) => {
    const key = `${entry.documentName}:${entry.version}`;
    setSelection(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [recId]: !(prev[key]?.[recId]) }
    }));
  };

  return (
    <div style={shell} ref={topRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Storage</div>
          <h2 style={{ margin: 0, fontSize: 24 }}>Manage folders, files, and AI guidance</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={primaryBtn} onClick={onCreateFolder}>Create Folder</button>
          <button style={{ ...dangerBtn, opacity: selectedFolder ? 1 : 0.5, cursor: selectedFolder ? 'pointer' : 'not-allowed' }} onClick={onDeleteFolder} disabled={!selectedFolder}>Delete Folder</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        <div style={card}>
          <div style={label}>Select Folder</div>
          <select value={selectedFolder} onChange={(e) => setSelectedFolder(e.target.value)} style={selectStyle}>
            <option value="">-- choose --</option>
            {folders.map(f => (<option key={f} value={f}>{f}</option>))}
          </select>
        </div>

        <div style={card}>
          <div style={label}>Filter by Document</div>
          <input value={selectedDoc} onChange={(e) => setSelectedDoc(e.target.value)} placeholder="filename.ext" style={inputStyle} />
        </div>

        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={label}>Upload files</div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => setFilesToUpload(Array.from(e.target.files || []))}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 10,
                border: '1px solid #374151',
                background: '#0b1220',
                color: '#e2e8f0',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            />
            {filesToUpload.length > 0 && (
              <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 12 }}>
                {filesToUpload.length} file(s) selected
              </div>
            )}
          </div>
          <button
            style={{ 
              ...primaryBtn, 
              opacity: selectedFolder && filesToUpload.length && !uploading ? 1 : 0.5, 
              cursor: selectedFolder && filesToUpload.length && !uploading ? 'pointer' : 'not-allowed', 
              width: '100%', 
              transition: 'all 0.2s ease',
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            disabled={!selectedFolder || !filesToUpload.length || uploading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Upload button clicked', { selectedFolder, filesToUpload: filesToUpload.length, uploading });
              onUpload();
            }}
          >
            {uploading ? 'Uploading... (this may take a few seconds)' : 'Upload'}
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ margin: 0, color: '#e2e8f0' }}>Recommendations Trail</h4>
          {selectedFolder ? <span style={{ color: '#94a3b8', fontSize: 12 }}>Folder: {selectedFolder}</span> : <span style={{ color: '#94a3b8', fontSize: 12 }}>Select a folder to view</span>}
        </div>
        {!trail.length && <div style={{ padding: 12, color: '#94a3b8' }}>No recommendations yet</div>}
        <div style={{ display: 'grid', gap: 12, maxHeight: '400px', overflowY: 'auto', paddingRight: 8 }}>
          {trail.map((t) => (
            <div key={`${t.documentName}-${t.version}`} style={{ ...subCard }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{t.documentName}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>v{t.version}</div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {t.recommendations.map(r => (
                  <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '1px solid #1e293b', borderRadius: 8, background: '#0b1220' }}>
                    <input type="checkbox" checked={!!selection[`${t.documentName}:${t.version}`]?.[r.id]} onChange={() => toggleSelect(t, r.id)} />
                    <span style={{ fontSize: 12, color: statusColor[r.status] || '#e2e8f0' }}>[{r.status}]</span>
                    <span style={{ color: '#e2e8f0' }}>{r.point}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button style={primaryBtn} onClick={() => onAcceptReject(t)}>Accept Selected (or all pending)</button>
                <button style={secondaryBtn} onClick={() => onRejectSelected(t)}>Reject Selected</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...card, minHeight: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h4 style={{ margin: 0, color: '#e2e8f0' }}>AI Storage Assistant</h4>
          {selectedFolder ? <span style={{ color: '#94a3b8', fontSize: 12 }}>Folder: {selectedFolder}</span> : <span style={{ color: '#94a3b8', fontSize: 12 }}>Select a folder to enable</span>}
        </div>
        {selectedFolder ? (
          <StorageChat folder={selectedFolder} document={selectedDoc} />
        ) : (
          <div style={{
            height: '100%',
            minHeight: 260,
            border: '1px dashed #1e293b',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8'
          }}>
            Select a folder to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default StorageManager;
