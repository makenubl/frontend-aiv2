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
  boxSizing: 'border-box',
  overflowAnchor: 'none'
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
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [filesInFolder, setFilesInFolder] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const spinnerKeyframes = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

  // Auto-clear status message after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const refreshFolders = async () => {
    const { data } = await storageApi.listFolders();
    setFolders(data.folders || []);
  };

  const refreshTrail = async () => {
    if (!selectedFolder) return;
    const { data } = await storageApi.listRecommendations(selectedFolder, selectedDoc || undefined);
    setTrail(data.trail || []);
  };

  const refreshFiles = async () => {
    if (!selectedFolder) {
      setFilesInFolder([]);
      return;
    }
    const { data } = await storageApi.listFiles(selectedFolder);
    setFilesInFolder(data.files || []);
  };

  useEffect(() => {
    refreshFolders();
  }, []);

  useEffect(() => {
    if (!selectedFolder) {
      setTrail([]);
      setFilesInFolder([]);
      setLoadingData(false);
      return;
    }
    let cancelled = false;
    setLoadingData(true);
    Promise.all([refreshFiles(), refreshTrail()])
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setLoadingData(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder, selectedDoc]);

  const onCreateFolder = async () => {
    const name = window.prompt('Folder name');
    if (!name) return;
    try {
      await storageApi.createFolder(name);
      await refreshFolders();
      setSelectedFolder(name);
      setStatusMessage({ text: `Folder "${name}" created`, type: 'success' });
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to create folder';
      console.error('Create folder error:', e);
      setStatusMessage({ text: errorMsg, type: 'error' });
    }
  };

  const onDeleteFolder = async () => {
    if (!selectedFolder) return;
    const ok = window.confirm(`Delete folder "${selectedFolder}" and its contents?`);
    if (!ok) return;
    const folderName = selectedFolder;
    try {
      await storageApi.deleteFolder(selectedFolder);
      setSelectedFolder('');
      setTrail([]);
      await refreshFolders();
      setStatusMessage({ text: `Folder "${folderName}" deleted`, type: 'success' });
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to delete folder';
      console.error('Delete error:', e);
      setStatusMessage({ text: errorMsg, type: 'error' });
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
      setLoadingData(true);
      const response = await storageApi.uploadToFolder(selectedFolder, filesToUpload);
      console.log('Upload response:', response.data);
      setFilesToUpload([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await Promise.all([refreshTrail(), refreshFiles()]);
      const message = response.data?.message || 'Upload complete';
      setStatusMessage({ text: message, type: 'success' });
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Upload failed';
      console.error('Upload error:', e);
      setStatusMessage({ text: errorMsg, type: 'error' });
    } finally {
      setUploading(false);
      setLoadingData(false);
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
      setStatusMessage({ text: 'Recommendations accepted', type: 'success' });
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to accept recommendations';
      console.error('Accept error:', e);
      setStatusMessage({ text: errorMsg, type: 'error' });
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
      setStatusMessage({ text: 'Recommendations rejected', type: 'success' });
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to reject recommendations';
      console.error('Reject error:', e);
      setStatusMessage({ text: errorMsg, type: 'error' });
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
    <div ref={shellRef} style={{...shell, scrollMarginTop: 0, contain: 'layout style paint'}}>
      <style>{spinnerKeyframes}</style>
      {(loadingData || uploading) && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          padding: '14px 18px',
          borderRadius: 12,
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid #1f2937',
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
          zIndex: 9998,
          pointerEvents: 'none'
        }}>
          <div className="spinner" style={{
            width: 20,
            height: 20,
            border: '3px solid #1f2937',
            borderTop: '3px solid #22d3ee',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <div style={{ fontWeight: 600 }}>
            {uploading ? 'Uploading files...' : 'Loading data...'}
          </div>
        </div>
      )}
      {statusMessage && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          padding: '12px 20px',
          borderRadius: 8,
          background: statusMessage.type === 'success' ? '#22c55e' : statusMessage.type === 'error' ? '#ef4444' : '#3b82f6',
          color: 'white',
          fontWeight: 600,
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {statusMessage.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 }}>
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Storage</div>
          <h2 style={{ margin: '4px 0', fontSize: 22 }}>Folders, Files, and AI Guidance</h2>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Manage uploads, recommendations, and chat without page jumps.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={primaryBtn} onClick={onCreateFolder}>Create Folder</button>
          <button style={{ ...dangerBtn, opacity: selectedFolder ? 1 : 0.5, cursor: selectedFolder ? 'pointer' : 'not-allowed' }} onClick={onDeleteFolder} disabled={!selectedFolder}>Delete Folder</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, alignItems: 'start' }}>
        {/* Left: folders panel */}
        <div style={{ display: 'grid', gap: 12, height: 'fit-content', position: 'sticky', top: 24 }}>
          <div style={{ ...card, height: 240, display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...label, marginBottom: 10 }}>Folders</div>
            <div style={{ flex: 1, display: 'grid', gap: 8, overflowY: 'auto', paddingRight: 4 }}>
              {!folders.length && <div style={{ color: '#94a3b8' }}>No folders yet. Create one to start.</div>}
              {folders.map(f => {
                const isActive = selectedFolder === f;
                return (
                  <button
                    key={f}
                    onClick={() => {
                      if (document && document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                      }
                      setSelectedFolder(f);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: isActive ? '1px solid #22d3ee' : '1px solid #1f2937',
                      background: isActive ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(34,211,238,0.2))' : '#0b1220',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ ...card, height: 'auto', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={label}>Filter by Document</div>
            <input
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              placeholder="filename.ext"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Right: main panels */}
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={label}>Upload files</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    console.log('Files selected:', files.map(f => f.name));
                    setFilesToUpload(files);
                  }}
                  style={{ position: 'absolute', left: -9999, opacity: 0 }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                      fileInputRef.current.click();
                    }
                  }}
                  style={{
                    ...secondaryBtn,
                    width: '100%',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    minHeight: 44,
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  📁 Choose Files
                </button>
                {filesToUpload.length > 0 && (
                  <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 12 }}>
                    {filesToUpload.length} file(s) selected: {filesToUpload.map(f => f.name).join(', ')}
                  </div>
                )}
              </div>
              <button
                type="button"
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!selectedFolder) {
                    setStatusMessage({ text: 'Please select a folder first', type: 'error' });
                    return;
                  }
                  if (!filesToUpload.length) {
                    setStatusMessage({ text: 'Please choose files first', type: 'error' });
                    return;
                  }
                  if (uploading) return;
                  onUpload();
                }}
              >
                {uploading ? 'Uploading... (this may take a few seconds)' : 'Upload'}
              </button>
            </div>

            <div style={{ ...card, minHeight: 180 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ ...label, marginBottom: 0 }}>Files in folder</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{selectedFolder || 'Select a folder'}</div>
              </div>
              {!selectedFolder && <div style={{ color: '#94a3b8' }}>Pick a folder to see its files.</div>}
              {selectedFolder && !filesInFolder.length && <div style={{ color: '#94a3b8' }}>No files yet.</div>}
              {selectedFolder && !!filesInFolder.length && (
                <div style={{ display: 'grid', gap: 6, maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
                  {filesInFolder.map((f) => (
                    <div key={f} style={{ padding: '8px 10px', background: '#0b1220', borderRadius: 8, border: '1px solid #1f2937' }}>
                      {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ ...card, minHeight: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0, color: '#e2e8f0' }}>Recommendations Trail</h4>
              {selectedFolder ? <span style={{ color: '#94a3b8', fontSize: 12 }}>Folder: {selectedFolder}</span> : <span style={{ color: '#94a3b8', fontSize: 12 }}>Select a folder to view</span>}
            </div>
            {!trail.length && <div style={{ padding: 12, color: '#94a3b8' }}>No recommendations yet</div>}
            <div style={{ display: 'grid', gap: 12, maxHeight: '360px', overflowY: 'auto', paddingRight: 8 }}>
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
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
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
      </div>
    </div>
  );
};

export default StorageManager;
