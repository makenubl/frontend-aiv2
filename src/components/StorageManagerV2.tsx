import React, { useEffect, useRef, useState } from 'react';
import { storageApi } from '../services/api';
import StorageChat from './StorageChat';

// CSS keyframes for typing animation
const typingAnimationStyles = `
@keyframes pulse {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}
`;

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

interface StorageManagerV2Props {
  onOpenDocumentChat?: (documentName: string, folderName: string) => void;
}

const StorageManagerV2: React.FC<StorageManagerV2Props> = ({ onOpenDocumentChat }) => {
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
  }, [selectedFolder, selectedDoc]);

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

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
      setStatusMessage({ text: 'Please select a folder and choose files', type: 'error' });
      return;
    }
    try {
      setUploading(true);
      setLoadingData(true);
      const response = await storageApi.uploadToFolder(selectedFolder, filesToUpload);
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

  // Open chat with document context - navigates to full page chat
  const openChatWithDocument = async (entry: TrailEntry) => {
    if (onOpenDocumentChat) {
      onOpenDocumentChat(entry.documentName, selectedFolder);
    }
  };

  const statusColor: Record<string, string> = {
    pending: '#f59e0b',
    accepted: '#22c55e',
    rejected: '#ef4444'
  };

  return (
    <>
      {/* Inject animation styles */}
      <style>{typingAnimationStyles}</style>
      
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#0f172a',
        color: '#e2e8f0',
        overflow: 'hidden',
        zIndex: 0
      }}>
        {/* Header - Fixed */}
        <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #1f2937',
        background: '#111827',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        zIndex: 100,
        position: 'relative'
      }}>
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Storage</div>
          <h2 style={{ margin: '4px 0', fontSize: 20 }}>Folders, Files & AI Guidance</h2>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        padding: 12,
        overflow: 'hidden'
      }}>
        {/* Left Panel: Upload & Files */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overflow: 'hidden'
        }}>
          <div style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Select Folder
            </div>
            
            {/* Folder Dropdown */}
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #374151',
                background: '#0b1220',
                color: '#e2e8f0',
                fontSize: 13,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">-- Choose Folder --</option>
              {folders.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            {/* Folder Management Buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={async () => {
                  const name = prompt('New folder name:');
                  if (!name) return;
                  try {
                    await storageApi.createFolder(name);
                    await refreshFolders();
                    setStatusMessage({ text: 'Folder created', type: 'success' });
                  } catch (e: any) {
                    setStatusMessage({ text: e.response?.data?.error || 'Error creating folder', type: 'error' });
                  }
                }}
                style={{
                  flex: 1,
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  padding: '8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12
                }}
              >
                + New Folder
              </button>
              <button
                onClick={async () => {
                  if (!selectedFolder) {
                    alert('Select a folder first');
                    return;
                  }
                  if (!window.confirm(`Delete folder "${selectedFolder}"?`)) return;
                  try {
                    await storageApi.deleteFolder(selectedFolder);
                    setSelectedFolder('');
                    await refreshFolders();
                    setStatusMessage({ text: 'Folder deleted', type: 'success' });
                  } catch (e: any) {
                    setStatusMessage({ text: e.response?.data?.error || 'Error deleting folder', type: 'error' });
                  }
                }}
                disabled={!selectedFolder}
                style={{
                  flex: 1,
                  background: selectedFolder ? '#ef4444' : '#374151',
                  color: 'white',
                  border: 'none',
                  padding: '8px',
                  borderRadius: 6,
                  cursor: selectedFolder ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  fontSize: 12,
                  opacity: selectedFolder ? 1 : 0.5
                }}
              >
                🗑 Delete Folder
              </button>
            </div>

            <div style={{ borderTop: '1px solid #1f2937', paddingTop: 10, marginTop: 4 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Upload Files
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => setFilesToUpload(Array.from(e.target.files || []))}
              style={{ position: 'absolute', left: -9999, opacity: 0 }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: '#1f2937',
                color: '#e2e8f0',
                border: '1px solid #374151',
                padding: '12px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                transition: 'all 0.2s'
              }}
            >
              📁 Choose Files
            </button>
            {filesToUpload.length > 0 && (
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                {filesToUpload.length} file(s): {filesToUpload.map(f => f.name).join(', ')}
              </div>
            )}
            <button
              onClick={onUpload}
              disabled={!selectedFolder || !filesToUpload.length || uploading}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: 8,
                cursor: selectedFolder && filesToUpload.length && !uploading ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                fontSize: 13,
                opacity: selectedFolder && filesToUpload.length && !uploading ? 1 : 0.5,
                transition: 'all 0.2s'
              }}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>

          <div style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flex: 1,
            overflow: 'hidden'
          }}>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Files in Folder
              {filesToUpload.length > 0 && <span style={{ color: '#22d3ee', marginLeft: 8, fontSize: 10 }}>(1 selected)</span>}
            </div>
            {!selectedFolder && <div style={{ color: '#94a3b8', fontSize: 13 }}>Select a folder</div>}
            {selectedFolder && !filesInFolder.length && <div style={{ color: '#94a3b8', fontSize: 13 }}>No files yet</div>}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filesInFolder.map(f => {
                const isSelected = filesToUpload.some(file => file.name === f);
                return (
                  <button
                    key={f}
                    onClick={() => {
                      if (isSelected) {
                        setFilesToUpload([]);
                      } else {
                        // Single file selection - replace any existing selection
                        const newFile = new File([''], f, { type: 'application/octet-stream' });
                        setFilesToUpload([newFile]);
                      }
                    }}
                    style={{
                      padding: '10px',
                      background: isSelected ? '#0f766e' : '#0b1220',
                      borderRadius: 6,
                      border: isSelected ? '2px solid #22d3ee' : '1px solid #1f2937',
                      fontSize: 12,
                      color: isSelected ? '#22d3ee' : '#e2e8f0',
                      wordBreak: 'break-word',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontWeight: isSelected ? 600 : 400
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#22d3ee';
                        e.currentTarget.style.background = '#1f2937';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#1f2937';
                        e.currentTarget.style.background = '#0b1220';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{isSelected ? '✓' : '○'}</span>
                      <span style={{ flex: 1 }}>{f}</span>
                    </div>
                    {/* File Metadata - shown when selected */}
                    {isSelected && (
                      <div style={{ 
                        marginTop: 12, 
                        paddingTop: 12, 
                        borderTop: '1px solid #1e3a5f',
                        fontSize: 11,
                        color: '#64748b',
                        background: 'rgba(15, 23, 42, 0.5)',
                        borderRadius: 8,
                        padding: 12,
                        marginLeft: -6,
                        marginRight: -6
                      }}>
                        <div style={{ 
                          fontSize: 10, 
                          color: '#94a3b8', 
                          textTransform: 'uppercase', 
                          letterSpacing: 0.5, 
                          marginBottom: 10,
                          fontWeight: 600
                        }}>
                          Document Info
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div style={{ 
                            background: 'rgba(30, 41, 59, 0.5)', 
                            padding: '8px 10px', 
                            borderRadius: 6,
                            border: '1px solid #1e293b'
                          }}>
                            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>📅 Created</div>
                            <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 500 }}>{new Date().toLocaleDateString('en-GB')}</div>
                          </div>
                          <div style={{ 
                            background: 'rgba(30, 41, 59, 0.5)', 
                            padding: '8px 10px', 
                            borderRadius: 6,
                            border: '1px solid #1e293b'
                          }}>
                            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>📝 Modified</div>
                            <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 500 }}>{new Date().toLocaleDateString('en-GB')}</div>
                          </div>
                          <div style={{ 
                            background: 'rgba(30, 41, 59, 0.5)', 
                            padding: '8px 10px', 
                            borderRadius: 6,
                            border: '1px solid #1e293b'
                          }}>
                            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>👤 Owner</div>
                            <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 500 }}>System</div>
                          </div>
                          <div style={{ 
                            background: 'rgba(30, 41, 59, 0.5)', 
                            padding: '8px 10px', 
                            borderRadius: 6,
                            border: '1px solid #1e293b'
                          }}>
                            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>📊 Status</div>
                            <div style={{ 
                              fontSize: 11, 
                              color: '#22c55e', 
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <span style={{ 
                                width: 6, 
                                height: 6, 
                                borderRadius: '50%', 
                                background: '#22c55e',
                                display: 'inline-block'
                              }}></span>
                              Active
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* File Actions */}
            {filesToUpload.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid #1f2937', position: 'relative', zIndex: 50 }}>
                {/* Chat with Document Button - Full Width */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const fileName = filesToUpload[0]?.name || 'document';
                    const minimalEntry: TrailEntry = {
                      documentName: fileName,
                      version: 1,
                      recommendations: [],
                      createdAt: new Date().toISOString()
                    };
                    openChatWithDocument(minimalEntry);
                  }}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '14px 16px',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    zIndex: 100,
                    position: 'relative',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                  }}
                >
                  💬 Chat with Document
                </button>
                
                {/* Download and Delete Row */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={async () => {
                      const fileName = filesToUpload[0].name;
                      try {
                        const response = await storageApi.downloadFile(selectedFolder, fileName);
                        const blob = new Blob([response.data]);
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        setStatusMessage({ text: 'File downloaded successfully', type: 'success' });
                      } catch (e) {
                        console.error('Download error:', e);
                        setStatusMessage({ text: 'Error downloading file', type: 'error' });
                      }
                    }}
                    style={{
                      flex: 1,
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 12
                    }}
                  >
                    ⬇ Download
                  </button>
                  <button
                    onClick={async () => {
                      const fileName = filesToUpload[0].name;
                      if (!window.confirm(`Delete "${fileName}"?`)) return;
                      try {
                        await storageApi.deleteFile(selectedFolder, fileName);
                        setFilesToUpload([]);
                        await refreshFiles();
                        setStatusMessage({ text: 'File deleted', type: 'success' });
                      } catch (e: any) {
                        setStatusMessage({ text: e.response?.data?.error || 'Error deleting file', type: 'error' });
                      }
                  }}
                  style={{
                    flex: 1,
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12
                  }}
                >
                  🗑 Delete
                </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Recommendations */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: 12,
            padding: 16,
            minHeight: '600px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {!filesToUpload.length ? (
              <div style={{ color: '#94a3b8', fontSize: 13, padding: '20px', textAlign: 'center' }}>
                📁 Choose files in the Upload panel to view recommendations
              </div>
            ) : (
              <>
                {/* Recommendations List View */}
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Recommendations
                </div>
                <div style={{ fontSize: 12, color: '#22d3ee', marginBottom: 8, fontWeight: 600 }}>
                  Selected File: {filesToUpload.map(f => f.name).join(', ')}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {trail.length === 0 ? (
                    <div style={{ 
                      color: '#94a3b8', 
                      fontSize: 13, 
                      padding: '20px', 
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 1
                    }}>
                      <div style={{ marginBottom: 16 }}>No recommendations yet for selected file</div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Create a minimal TrailEntry for chat
                          const fileName = filesToUpload[0]?.name || 'document';
                          const minimalEntry: TrailEntry = {
                            documentName: fileName,
                            version: 1,
                            recommendations: [],
                            createdAt: new Date().toISOString()
                          };
                          openChatWithDocument(minimalEntry);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)',
                          border: 'none',
                          borderRadius: 8,
                          padding: '14px 28px',
                          color: '#0f172a',
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          boxShadow: '0 4px 12px rgba(34, 211, 238, 0.3)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 211, 238, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 211, 238, 0.3)';
                        }}
                      >
                        💬 Chat with Document
                      </button>
                    </div>
                  ) : (
                    trail.map((t) => (
                    <div
                      key={`${t.documentName}-${t.version}`}
                      style={{
                        background: '#0b1220',
                        border: '1px solid #1e293b',
                        borderRadius: 10,
                        padding: 14,
                        fontSize: 12,
                        transition: 'all 0.2s'
                      }}
                    >
                      {/* Document Header */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: 10
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4, fontSize: 13 }}>
                            📄 {t.documentName}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            Version {t.version} • {t.recommendations.length} recommendations
                          </div>
                        </div>
                        <span style={{
                          background: t.recommendations.some(r => r.status === 'pending') 
                            ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                            : 'linear-gradient(135deg, #22c55e, #16a34a)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 600
                        }}>
                          {t.recommendations.filter(r => r.status === 'pending').length > 0 
                            ? `${t.recommendations.filter(r => r.status === 'pending').length} Pending`
                            : '✓ Reviewed'}
                        </span>
                      </div>

                      {/* Document Trail Info */}
                      <div style={{
                        background: '#111827',
                        borderRadius: 6,
                        padding: 10,
                        marginBottom: 10,
                        fontSize: 11
                      }}>
                        <div style={{ color: '#94a3b8', marginBottom: 6 }}>
                          <span style={{ color: '#22d3ee' }}>📅 Created:</span>{' '}
                          {t.createdAt ? new Date(t.createdAt).toLocaleString() : 'Unknown'}
                        </div>
                        <div style={{ color: '#94a3b8', marginBottom: 6 }}>
                          <span style={{ color: '#22d3ee' }}>✏️ Last Modified:</span>{' '}
                          {t.updatedAt ? new Date(t.updatedAt).toLocaleString() : 'Not modified'}
                        </div>
                        <div style={{ color: '#94a3b8' }}>
                          <span style={{ color: '#22d3ee' }}>👤 Owner:</span>{' '}
                          PVARA System
                        </div>
                      </div>

                      {/* Recommendations Summary */}
                      {t.recommendations.length > 0 && (
                        <div style={{
                          background: '#111827',
                          borderRadius: 6,
                          padding: 10,
                          marginBottom: 10,
                          fontSize: 11,
                          maxHeight: 80,
                          overflowY: 'auto'
                        }}>
                          <div style={{ color: '#22d3ee', marginBottom: 6, fontWeight: 600 }}>
                            📋 Summary:
                          </div>
                          <div style={{ color: '#94a3b8', lineHeight: 1.5 }}>
                            {t.recommendations.slice(0, 2).map((r, idx) => (
                              <div key={r.id} style={{ 
                                marginBottom: 4,
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 6
                              }}>
                                <span style={{ 
                                  color: r.status === 'pending' ? '#f59e0b' : r.status === 'accepted' ? '#22c55e' : '#ef4444',
                                  fontSize: 10
                                }}>●</span>
                                <span style={{ flex: 1 }}>
                                  {r.point.length > 60 ? r.point.substring(0, 60) + '...' : r.point}
                                </span>
                              </div>
                            ))}
                            {t.recommendations.length > 2 && (
                              <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                                +{t.recommendations.length - 2} more...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Chat Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openChatWithDocument(t);
                        }}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                          border: 'none',
                          borderRadius: 6,
                          padding: '12px 16px',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          position: 'relative',
                          zIndex: 10,
                          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
                        }}
                      >
                        💬 Chat with Document
                      </button>
                    </div>
                  ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar - Fixed */}
      {statusMessage && (
        <div style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          padding: '12px 20px',
          borderRadius: 8,
          background: statusMessage.type === 'success' ? '#22c55e' : statusMessage.type === 'error' ? '#ef4444' : '#3b82f6',
          color: 'white',
          fontWeight: 600,
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          fontSize: 13
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Loading Indicator - Fixed */}
      {(loadingData || uploading) && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 16,
          padding: '12px 16px',
          borderRadius: 8,
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid #1f2937',
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 9998,
          pointerEvents: 'none',
          fontSize: 13
        }}>
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid #1f2937',
              borderTopColor: '#22d3ee',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          {uploading ? 'Uploading...' : 'Loading...'}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      </div>
    </>
  );
};

export default StorageManagerV2;
