import React, { useEffect, useState } from 'react';
import { FiFolder, FiUpload, FiFile, FiCheck, FiX, FiPlus, FiFilter } from 'react-icons/fi';
import { storageApi } from '../services/api';

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
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refreshFolders = async () => {
    try {
      setLoading(true);
      const { data } = await storageApi.listFolders();
      setFolders(data.folders || []);
    } finally {
      setLoading(false);
    }
  };

  const refreshTrail = async () => {
    if (!selectedFolder) return;
    try {
      setLoading(true);
      const { data } = await storageApi.listRecommendations(selectedFolder, selectedDoc || undefined);
      setTrail(data.trail || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshFolders();
  }, []);

  useEffect(() => {
    refreshTrail();
  }, [selectedFolder, selectedDoc]);

  const onCreateFolder = async () => {
    const name = prompt('Enter folder name:');
    if (!name) return;
    try {
      setLoading(true);
      await storageApi.createFolder(name);
      await refreshFolders();
      setSelectedFolder(name);
    } finally {
      setLoading(false);
    }
  };

  const onUpload = async () => {
    if (!selectedFolder || !filesToUpload.length) return;
    try {
      setUploading(true);
      await storageApi.uploadToFolder(selectedFolder, filesToUpload);
      setFilesToUpload([]);
      await refreshTrail();
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
    await storageApi.decideRecommendations(entry.applicationId, entry.documentName, entry.version, effectiveIds, []);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#fbbf24';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <FiCheck size={14} />;
      case 'rejected': return <FiX size={14} />;
      default: return null;
    }
  };

  return (
    <div style={{ padding: 'var(--space-2xl)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <h2 style={{ 
          fontSize: '2rem', 
          fontWeight: 700,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 'var(--space-sm)'
        }}>
          Document Storage & AI Recommendations
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Upload documents, receive AI-powered recommendations, and track improvements across versions
        </p>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-xl)' }}>
        
        {/* Left Sidebar - Folders & Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          
          {/* Create Folder Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            borderRadius: '16px',
            padding: 'var(--space-lg)',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}>
            <button 
              onClick={onCreateFolder}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              <FiPlus size={18} /> Create New Folder
            </button>
          </div>

          {/* Folders List */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '16px',
            padding: 'var(--space-lg)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              marginBottom: 'var(--space-md)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontWeight: 600
            }}>
              <FiFolder size={18} />
              Folders ({folders.length})
            </div>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                Loading...
              </div>
            ) : folders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No folders yet. Create one to get started!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {folders.map(f => (
                  <div
                    key={f}
                    onClick={() => setSelectedFolder(f)}
                    style={{
                      padding: '12px 16px',
                      background: selectedFolder === f 
                        ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${selectedFolder === f ? 'rgba(102, 126, 234, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem'
                    }}
                  >
                    <FiFolder size={16} color={selectedFolder === f ? '#667eea' : '#94a3b8'} />
                    {f}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Section */}
          {selectedFolder && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '16px',
              padding: 'var(--space-lg)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                marginBottom: 'var(--space-md)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontWeight: 600
              }}>
                <FiUpload size={18} />
                Upload Documents
              </div>
              
              <label style={{
                display: 'block',
                padding: '30px 20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '2px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: 'var(--space-md)'
              }}>
                <input 
                  type="file" 
                  multiple 
                  onChange={(e) => setFilesToUpload(Array.from(e.target.files || []))}
                  style={{ display: 'none' }}
                />
                <FiFile size={24} style={{ marginBottom: '10px', opacity: 0.5 }} />
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {filesToUpload.length > 0 
                    ? `${filesToUpload.length} file(s) selected`
                    : 'Click to select files'
                  }
                </div>
              </label>

              <button
                onClick={onUpload}
                disabled={!filesToUpload.length || uploading}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: filesToUpload.length ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: filesToUpload.length && !uploading ? 'pointer' : 'not-allowed',
                  opacity: filesToUpload.length && !uploading ? 1 : 0.5,
                  transition: 'all 0.2s'
                }}
              >
                {uploading ? 'Uploading...' : 'Upload & Analyze'}
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Recommendations */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '16px',
          padding: 'var(--space-xl)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          minHeight: '600px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: 'var(--space-xl)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              color: 'var(--text-primary)',
              fontSize: '1.25rem',
              fontWeight: 600
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FiFile size={20} color="white" />
              </div>
              AI Recommendations Trail
            </div>

            {selectedFolder && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FiFilter size={16} color="#94a3b8" />
                <input
                  value={selectedDoc}
                  onChange={(e) => setSelectedDoc(e.target.value)}
                  placeholder="Filter by filename..."
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    width: '200px'
                  }}
                />
              </div>
            )}
          </div>

          {!selectedFolder ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: 'var(--text-secondary)'
            }}>
              <FiFolder size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
              <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No folder selected</div>
              <div style={{ fontSize: '0.9rem' }}>Select or create a folder to view recommendations</div>
            </div>
          ) : !trail.length ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: 'var(--text-secondary)'
            }}>
              <FiFile size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
              <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No documents yet</div>
              <div style={{ fontSize: '0.9rem' }}>Upload documents to receive AI recommendations</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              {trail.map((t) => {
                const key = `${t.documentName}:${t.version}`;
                const selectedCount = Object.values(selection[key] || {}).filter(Boolean).length;
                
                return (
                  <div key={key} style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: 'var(--space-lg)',
                    transition: 'all 0.2s'
                  }}>
                    {/* Document Header */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginBottom: 'var(--space-md)',
                      paddingBottom: 'var(--space-md)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div>
                        <div style={{ 
                          color: 'var(--text-primary)', 
                          fontSize: '1.05rem', 
                          fontWeight: 600,
                          marginBottom: '4px'
                        }}>
                          {t.documentName}
                        </div>
                        <div style={{ 
                          color: 'var(--text-secondary)', 
                          fontSize: '0.85rem'
                        }}>
                          Version {t.version} • {t.recommendations.length} recommendation{t.recommendations.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{
                        padding: '6px 12px',
                        background: 'rgba(102, 126, 234, 0.2)',
                        border: '1px solid rgba(102, 126, 234, 0.3)',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: '#a5b4fc',
                        fontWeight: 500
                      }}>
                        v{t.version}
                      </div>
                    </div>

                    {/* Recommendations List */}
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      {t.recommendations.map(r => (
                        <div key={r.id} style={{
                          padding: '12px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${selection[key]?.[r.id] ? 'rgba(102, 126, 234, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
                          borderRadius: '8px',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => toggleSelect(t, r.id)}
                        >
                          <input
                            type="checkbox"
                            checked={!!selection[key]?.[r.id]}
                            onChange={() => {}}
                            style={{ 
                              marginTop: '2px',
                              cursor: 'pointer',
                              accentColor: '#667eea'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              marginBottom: '4px'
                            }}>
                              <span style={{
                                padding: '3px 8px',
                                background: `${getStatusColor(r.status)}22`,
                                border: `1px solid ${getStatusColor(r.status)}44`,
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                color: getStatusColor(r.status),
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                textTransform: 'uppercase'
                              }}>
                                {getStatusIcon(r.status)}
                                {r.status}
                              </span>
                            </div>
                            <div style={{ 
                              color: 'var(--text-primary)', 
                              fontSize: '0.95rem',
                              lineHeight: '1.5'
                            }}>
                              {r.point}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '10px',
                      paddingTop: 'var(--space-md)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <button
                        onClick={() => onAcceptReject(t)}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <FiCheck size={16} />
                        Accept {selectedCount > 0 ? `(${selectedCount})` : 'All Pending'}
                      </button>
                      <button
                        onClick={() => onRejectSelected(t)}
                        disabled={selectedCount === 0}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          background: selectedCount > 0 ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'rgba(255, 255, 255, 0.05)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
                          opacity: selectedCount > 0 ? 1 : 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <FiX size={16} />
                        Reject {selectedCount > 0 ? `(${selectedCount})` : 'Selected'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorageManager;
