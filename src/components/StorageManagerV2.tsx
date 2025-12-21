import React, { useEffect, useRef, useState, useCallback } from 'react';
import { storageApi } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';

interface RecommendationItem {
  id: string;
  point: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface TrailEntry {
  documentName: string;
  version: number;
  recommendations: RecommendationItem[];
}

interface StorageManagerV2Props {
  onOpenDocumentChat?: (documentName: string, folderName: string) => void;
  onOpenProjectWizard?: () => void;
}

const StorageManagerV2: React.FC<StorageManagerV2Props> = ({ onOpenDocumentChat, onOpenProjectWizard }) => {
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [filesInFolder, setFilesInFolder] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Role-based permissions
  const permissions = usePermissions();

  const refreshFolders = async () => {
    const { data } = await storageApi.listFolders();
    setFolders(data.folders || []);
  };

  const refreshFiles = async () => {
    if (!selectedFolder) { setFilesInFolder([]); return; }
    const { data } = await storageApi.listFiles(selectedFolder);
    setFilesInFolder(data.files || []);
  };

  const refreshTrail = async () => {
    if (!selectedFolder) return;
    const { data } = await storageApi.listRecommendations(selectedFolder);
    setTrail(data.trail || []);
  };

  useEffect(() => { refreshFolders(); }, []);

  useEffect(() => {
    if (!selectedFolder) { setTrail([]); setFilesInFolder([]); setSelectedFiles([]); return; }
    setLoadingData(true);
    Promise.all([refreshFiles(), refreshTrail()]).finally(() => setLoadingData(false));
  }, [selectedFolder]);

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const onUpload = async () => {
    if (!selectedFolder || !filesToUpload.length) return;
    try {
      setUploading(true);
      await storageApi.uploadToFolder(selectedFolder, filesToUpload);
      setFilesToUpload([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await Promise.all([refreshTrail(), refreshFiles()]);
      setStatusMessage({ text: `${filesToUpload.length} file(s) uploaded`, type: 'success' });
    } catch (e: any) {
      setStatusMessage({ text: e?.response?.data?.error || 'Upload failed', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const openChatWithDocument = (fileName: string) => {
    if (onOpenDocumentChat) onOpenDocumentChat(fileName, selectedFolder);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (selectedFolder) setIsDragging(true);
  }, [selectedFolder]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!selectedFolder) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) setFilesToUpload(prev => [...prev, ...files]);
  }, [selectedFolder]);

  const toggleFileSelection = (fileName: string) => {
    setSelectedFiles(prev => prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]);
  };

  const selectAllFiles = () => {
    setSelectedFiles(selectedFiles.length === filesInFolder.length ? [] : [...filesInFolder]);
  };

  const deleteSelectedFiles = async () => {
    if (!selectedFiles.length || !window.confirm(`Delete ${selectedFiles.length} file(s)?`)) return;
    try {
      for (const fileName of selectedFiles) await storageApi.deleteFile(selectedFolder, fileName);
      setSelectedFiles([]);
      await refreshFiles();
      setStatusMessage({ text: `${selectedFiles.length} file(s) deleted`, type: 'success' });
    } catch (e: any) {
      setStatusMessage({ text: 'Error deleting files', type: 'error' });
    }
  };

  const downloadSelectedFiles = async () => {
    for (const fileName of selectedFiles) {
      try {
        const response = await storageApi.downloadFile(selectedFolder, fileName);
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (e) { console.error(e); }
    }
    setStatusMessage({ text: `${selectedFiles.length} file(s) downloaded`, type: 'success' });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📕';
    if (ext === 'doc' || ext === 'docx') return '📘';
    if (ext === 'xls' || ext === 'xlsx') return '📊';
    return '📄';
  };

  const getFileRecommendations = (fileName: string) => trail.find(t => t.documentName === fileName)?.recommendations || [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1f2937', background: '#111827', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Document Management</div>
          <h2 style={{ margin: '4px 0', fontSize: 22, fontWeight: 600 }}>📂 Storage Manager</h2>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button 
            onClick={() => onOpenProjectWizard?.()} 
            style={{ 
              background: 'linear-gradient(135deg, #667eea, #764ba2)', 
              border: 'none', 
              borderRadius: 8, 
              padding: '10px 20px', 
              color: 'white', 
              cursor: 'pointer', 
              fontWeight: 600, 
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: 16 }}>✨</span>
            New Project Wizard
          </button>
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0', cursor: 'pointer', fontSize: 12 }}>
            {viewMode === 'grid' ? '📋 List View' : '⊞ Grid View'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 16, gap: 16 }}>
        
        {/* Folder Section */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>📁 Folders</div>
            {permissions.canUploadFiles ? (
              <button onClick={async () => {
                const name = prompt('New folder name:');
                if (!name) return;
                try {
                  await storageApi.createFolder(name);
                  await refreshFolders();
                  setSelectedFolder(name);
                  setStatusMessage({ text: `Folder "${name}" created`, type: 'success' });
                } catch (e: any) {
                  setStatusMessage({ text: e.response?.data?.error || 'Error', type: 'error' });
                }
              }} style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: 6, padding: '8px 16px', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                + New Folder
              </button>
            ) : (
              <span style={{ fontSize: 11, color: '#64748b' }}>🔒 View Only</span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {folders.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 13, padding: '20px', width: '100%', textAlign: 'center' }}>No folders yet. Create one to get started!</div>
            ) : folders.map(folder => (
              <div key={folder} onClick={() => setSelectedFolder(folder)} style={{
                background: selectedFolder === folder ? 'linear-gradient(135deg, #0f766e, #0d9488)' : '#0b1220',
                border: selectedFolder === folder ? '2px solid #22d3ee' : '1px solid #1f2937',
                borderRadius: 10, padding: '14px 20px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10, minWidth: 160
              }}>
                <span style={{ fontSize: 24 }}>📁</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: selectedFolder === folder ? '#fff' : '#e2e8f0' }}>{folder}</div>
                  <div style={{ fontSize: 10, color: selectedFolder === folder ? '#a7f3d0' : '#64748b' }}>{selectedFolder === folder ? '✓ Selected' : 'Click to open'}</div>
                </div>
                {selectedFolder === folder && permissions.canDeleteFiles && (
                  <button onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm(`Delete folder "${folder}"?`)) return;
                    try { await storageApi.deleteFolder(folder); setSelectedFolder(''); await refreshFolders(); setStatusMessage({ text: 'Folder deleted', type: 'success' }); }
                    catch (e: any) { setStatusMessage({ text: 'Error', type: 'error' }); }
                  }} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: 4, padding: '4px 8px', color: '#ef4444', cursor: 'pointer', fontSize: 10, marginLeft: 'auto' }}>🗑</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Upload & Files Section */}
        {selectedFolder && (
          <>
            {/* Upload Area - Only show for users with upload permission */}
            {permissions.canUploadFiles && (
              <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} style={{
                background: isDragging ? 'linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(99, 102, 241, 0.1))' : '#111827',
                border: isDragging ? '2px dashed #22d3ee' : '1px solid #1f2937', borderRadius: 12, padding: 20, textAlign: 'center', transition: 'all 0.2s'
              }}>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.xls,.xlsx" onChange={(e) => setFilesToUpload(prev => [...prev, ...Array.from(e.target.files || [])])} style={{ display: 'none' }} />
                <div style={{ marginBottom: 12 }}><span style={{ fontSize: 32 }}>📤</span></div>
                <div style={{ fontSize: 14, color: '#e2e8f0', marginBottom: 4 }}>Drag & drop files here or</div>
                <button onClick={() => fileInputRef.current?.click()} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 8, padding: '10px 24px', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13, margin: '8px 0' }}>Browse Files</button>
                <div style={{ fontSize: 11, color: '#64748b' }}>Supports: PDF, DOC, DOCX, TXT, XLS, XLSX</div>

                {filesToUpload.length > 0 && (
                  <div style={{ marginTop: 16, padding: 12, background: '#0b1220', borderRadius: 8, textAlign: 'left' }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>📎 {filesToUpload.length} file(s) ready:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {filesToUpload.map((file, idx) => (
                        <div key={idx} style={{ background: '#1f2937', padding: '6px 10px', borderRadius: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {getFileIcon(file.name)} {file.name}
                          <button onClick={() => setFilesToUpload(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 4px', fontSize: 12 }}>×</button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={onUpload} disabled={uploading} style={{ flex: 1, background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: 6, padding: '10px', color: 'white', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, opacity: uploading ? 0.6 : 1 }}>
                        {uploading ? '⏳ Uploading...' : `⬆ Upload ${filesToUpload.length} File(s)`}
                      </button>
                      <button onClick={() => setFilesToUpload([])} style={{ background: '#374151', border: 'none', borderRadius: 6, padding: '10px 16px', color: '#e2e8f0', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Clear</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Files Section */}
            <div style={{ flex: 1, background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>📄 Files in "{selectedFolder}"</div>
                  <span style={{ background: '#1f2937', padding: '4px 10px', borderRadius: 12, fontSize: 11, color: '#22d3ee' }}>{filesInFolder.length} files</span>
                </div>
                {filesInFolder.length > 0 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={selectAllFiles} style={{ background: selectedFiles.length === filesInFolder.length ? '#0f766e' : '#1f2937', border: '1px solid #374151', borderRadius: 6, padding: '6px 12px', color: '#e2e8f0', cursor: 'pointer', fontSize: 11 }}>
                      {selectedFiles.length === filesInFolder.length ? '☑ Deselect All' : '☐ Select All'}
                    </button>
                    {selectedFiles.length > 0 && (
                      <>
                        <button onClick={downloadSelectedFiles} style={{ background: '#3b82f6', border: 'none', borderRadius: 6, padding: '6px 12px', color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>⬇ Download ({selectedFiles.length})</button>
                        {permissions.canDeleteFiles && (
                          <button onClick={deleteSelectedFiles} style={{ background: '#ef4444', border: 'none', borderRadius: 6, padding: '6px 12px', color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>🗑 Delete ({selectedFiles.length})</button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filesInFolder.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 48 }}>📭</span>
                    <div>No files in this folder yet</div>
                    <div style={{ fontSize: 12 }}>Upload files using the area above</div>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {filesInFolder.map(fileName => {
                      const isSelected = selectedFiles.includes(fileName);
                      const pendingCount = getFileRecommendations(fileName).filter(r => r.status === 'pending').length;
                      return (
                        <div key={fileName} onClick={() => toggleFileSelection(fileName)} style={{
                          background: isSelected ? 'linear-gradient(135deg, #0f766e, #0d9488)' : '#0b1220',
                          border: isSelected ? '2px solid #22d3ee' : '1px solid #1f2937', borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                            <span style={{ fontSize: 28 }}>{getFileIcon(fileName)}</span>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <div style={{ fontWeight: 600, fontSize: 12, color: '#e2e8f0', wordBreak: 'break-word', lineHeight: 1.3 }}>{fileName}</div>
                              {pendingCount > 0 && <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }}></span>{pendingCount} pending</div>}
                            </div>
                            <span style={{ fontSize: 16, color: isSelected ? '#22d3ee' : '#374151' }}>{isSelected ? '✓' : '○'}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={(e) => { e.stopPropagation(); openChatWithDocument(fileName); }} style={{ flex: 1, background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', border: 'none', borderRadius: 6, padding: '8px', color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>💬 Chat</button>
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const response = await storageApi.downloadFile(selectedFolder, fileName);
                                const blob = new Blob([response.data]);
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a'); a.href = url; a.download = fileName;
                                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                window.URL.revokeObjectURL(url);
                              } catch (e) { setStatusMessage({ text: 'Download failed', type: 'error' }); }
                            }} style={{ background: '#374151', border: 'none', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0', cursor: 'pointer', fontSize: 11 }}>⬇</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 100px 80px', gap: 12, padding: '8px 12px', background: '#1f2937', borderRadius: 6, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                      <div></div><div>Name</div><div>Status</div><div>Date</div><div>Actions</div>
                    </div>
                    {filesInFolder.map(fileName => {
                      const isSelected = selectedFiles.includes(fileName);
                      const pendingCount = getFileRecommendations(fileName).filter(r => r.status === 'pending').length;
                      return (
                        <div key={fileName} onClick={() => toggleFileSelection(fileName)} style={{
                          display: 'grid', gridTemplateColumns: '40px 1fr 100px 100px 80px', gap: 12, padding: '10px 12px',
                          background: isSelected ? '#0f766e' : '#0b1220', border: isSelected ? '1px solid #22d3ee' : '1px solid transparent',
                          borderRadius: 6, cursor: 'pointer', alignItems: 'center', transition: 'all 0.15s'
                        }}>
                          <span style={{ fontSize: 18, textAlign: 'center' }}>{getFileIcon(fileName)}</span>
                          <div style={{ fontSize: 12, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
                          <div>
                            {pendingCount > 0 
                              ? <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '3px 8px', borderRadius: 4, fontSize: 10 }}>{pendingCount} pending</span>
                              : <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '3px 8px', borderRadius: 4, fontSize: 10 }}>✓ Ready</span>
                            }
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{new Date().toLocaleDateString('en-GB')}</div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={(e) => { e.stopPropagation(); openChatWithDocument(fileName); }} style={{ background: '#3b82f6', border: 'none', borderRadius: 4, padding: '4px 8px', color: 'white', cursor: 'pointer', fontSize: 10 }}>💬</button>
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const response = await storageApi.downloadFile(selectedFolder, fileName);
                                const blob = new Blob([response.data]);
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a'); a.href = url; a.download = fileName;
                                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                window.URL.revokeObjectURL(url);
                              } catch (e) { setStatusMessage({ text: 'Download failed', type: 'error' }); }
                            }} style={{ background: '#374151', border: 'none', borderRadius: 4, padding: '4px 8px', color: '#e2e8f0', cursor: 'pointer', fontSize: 10 }}>⬇</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!selectedFolder && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: 16 }}>
            <span style={{ fontSize: 64 }}>📁</span>
            <div style={{ fontSize: 18, color: '#94a3b8' }}>Select a folder to view files</div>
            <div style={{ fontSize: 13 }}>Or create a new folder to get started</div>
          </div>
        )}
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div style={{ position: 'fixed', bottom: 16, right: 16, padding: '12px 20px', borderRadius: 8, background: statusMessage.type === 'success' ? '#22c55e' : statusMessage.type === 'error' ? '#ef4444' : '#3b82f6', color: 'white', fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontSize: 13 }}>
          {statusMessage.text}
        </div>
      )}

      {/* Loading */}
      {(loadingData || uploading) && (
        <div style={{ position: 'fixed', top: 80, right: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(15,23,42,0.95)', border: '1px solid #1f2937', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 10, zIndex: 9998, fontSize: 13 }}>
          <div style={{ width: 16, height: 16, border: '2px solid #1f2937', borderTopColor: '#22d3ee', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          {uploading ? 'Uploading...' : 'Loading...'}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default StorageManagerV2;
