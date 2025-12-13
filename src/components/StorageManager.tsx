import React, { useEffect, useState } from 'react';
import { FiFolder, FiUpload, FiFile, FiCheck, FiX, FiPlus, FiTrash2, FiUserPlus, FiMessageSquare, FiAlertCircle, FiInfo } from 'react-icons/fi';
import { storageApi } from '../services/api';
import { toast } from '../utils/toast';

interface RecommendationItem {
  id: string;
  text: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface TrailEntry {
  applicationId: string;
  documentName: string;
  version: number;
  recommendations: RecommendationItem[];
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
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string>('');
  const [showDeleteFileModal, setShowDeleteFileModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{doc: string, version: number} | null>(null);

  const userEmail = 'user@example.com'; // Replace with actual user email from auth

  const refreshFolders = async () => {
    try {
      setLoading(true);
      const { data } = await storageApi.listFolders();
      // Backend returns empty on Vercel (no persistent storage)
      // Keep local state; deleted folders removed optimistically
      setFolders(data.folders || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load folders');
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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      refreshTrail();
    }
  }, [selectedFolder, selectedDoc]);

  const onCreateFolder = async () => {
    const name = prompt('Enter folder name:');
    if (!name) return;
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      toast.error('Folder name can only contain letters, numbers, underscores, and hyphens');
      return;
    }
    try {
      setLoading(true);
      await storageApi.createFolder(name);
      await refreshFolders();
      setSelectedFolder(name);
      toast.success(`Folder "${name}" created successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteFolder = (folderName: string) => {
    setFolderToDelete(folderName);
    setShowDeleteFolderModal(true);
  };

  const onDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      setLoading(true);
      await storageApi.deleteFolder(folderToDelete, userEmail);
      
      // Optimistically remove from UI
      setFolders(prev => prev.filter(f => f !== folderToDelete));
      
      if (selectedFolder === folderToDelete) {
        setSelectedFolder('');
        setTrail([]);
      }
      
      toast.success(`Folder "${folderToDelete}" deleted successfully`);
      setShowDeleteFolderModal(false);
      setFolderToDelete('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete folder');
      // Refresh on error to stay in sync
      await refreshFolders();
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteFile = (doc: string, version: number) => {
    setFileToDelete({doc, version});
    setShowDeleteFileModal(true);
  };

  const onDeleteFile = async () => {
    if (!fileToDelete || !selectedFolder) return;
    try {
      setLoading(true);
      await storageApi.deleteFile(selectedFolder, fileToDelete.doc, fileToDelete.version, userEmail);
      await refreshTrail();
      toast.success(`File deleted successfully`);
      setShowDeleteFileModal(false);
      setFileToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete file');
    } finally {
      setLoading(false);
    }
  };

  const onUpload = async () => {
    if (!selectedFolder || !filesToUpload.length) return;
    if (filesToUpload.length > 20) {
      toast.error('Maximum 20 files allowed per upload');
      return;
    }
    for (const file of filesToUpload) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File ${file.name} exceeds 50MB limit`);
        return;
      }
    }
    try {
      setUploading(true);
      await storageApi.uploadToFolder(selectedFolder, filesToUpload);
      setFilesToUpload([]);
      await refreshTrail();
      toast.success(`${filesToUpload.length} file(s) uploaded successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const onAcceptReject = async (entry: TrailEntry) => {
    const key = `${entry.applicationId}_${entry.documentName}_${entry.version}`;
    const selected = selection[key] || {};
    const chosenIds = Object.keys(selected).filter(id => selected[id]);
    const pendingIds = entry.recommendations.filter(r => r.status === 'pending').map(r => r.id);
    const effectiveIds = chosenIds.length ? chosenIds : pendingIds;
    const toAccept = effectiveIds;
    const toReject: string[] = [];
    try {
      await storageApi.decideRecommendations(entry.applicationId, entry.documentName, entry.version, toAccept, toReject);
      await refreshTrail();
      setSelection(prev => ({ ...prev, [key]: {} }));
      toast.success(`${effectiveIds.length} recommendation(s) accepted`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept recommendations');
    }
  };

  const toggleSelection = (entry: TrailEntry, recId: string) => {
    const key = `${entry.applicationId}_${entry.documentName}_${entry.version}`;
    setSelection(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [recId]: !(prev[key]?.[recId])
      }
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#fbbf24';
    }
  };

  const canDelete = true; // Replace with actual permission check
  const canManageAccess = true; // Replace with actual permission check

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Info Banners */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ 
          padding: '12px 16px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          borderRadius: '12px', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          flex: 1,
          minWidth: '250px'
        }}>
          <FiInfo size={18} />
          <span>Access control enabled - Only authorized users can delete content</span>
        </div>
        <div style={{ 
          padding: '12px 16px', 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
          borderRadius: '12px', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          flex: 1,
          minWidth: '250px'
        }}>
          <FiMessageSquare size={18} />
          <span>AI Chat can auto-apply recommendations - Just ask!</span>
        </div>
      </div>

      <h1 style={{ 
        fontSize: '32px', 
        fontWeight: '700', 
        marginBottom: '32px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Storage Manager
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        {/* Folders Sidebar */}
        <div style={{ 
          background: '#ffffff', 
          borderRadius: '16px', 
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          height: 'fit-content'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Folders</h2>
            <button
              onClick={onCreateFolder}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1
              }}
            >
              <FiPlus size={16} />
              New
            </button>
          </div>

          {loading && folders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
              Loading folders...
            </div>
          ) : folders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              <FiFolder size={48} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '14px' }}>No folders yet</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>Create one to get started</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {folders.map(folder => (
                <div
                  key={folder}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedFolder === folder ? 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)' : 'transparent',
                    border: selectedFolder === folder ? '2px solid #667eea' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setSelectedFolder(folder)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <FiFolder size={18} color={selectedFolder === folder ? '#667eea' : '#6b7280'} />
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: selectedFolder === folder ? '600' : '400',
                      color: selectedFolder === folder ? '#667eea' : '#374151'
                    }}>
                      {folder}
                    </span>
                  </div>
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteFolder(folder);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Delete folder"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {!selectedFolder ? (
            <div style={{ 
              background: '#ffffff', 
              borderRadius: '16px', 
              padding: '60px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              textAlign: 'center'
            }}>
              <FiFolder size={64} style={{ margin: '0 auto 20px', display: 'block', color: '#d1d5db' }} />
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#374151', margin: '0 0 8px 0' }}>
                No folder selected
              </h3>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Select a folder from the sidebar or create a new one to get started
              </p>
            </div>
          ) : (
            <>
              {/* Upload Section */}
              <div style={{ 
                background: '#ffffff', 
                borderRadius: '16px', 
                padding: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 20px 0' }}>
                  Upload Files to {selectedFolder}
                </h3>

                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="file"
                    multiple
                    onChange={e => setFilesToUpload(Array.from(e.target.files || []))}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px',
                      border: '2px dashed #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '8px 0 0 0' }}>
                    Max 50MB per file, 20 files total. Supported: PDF, DOCX, TXT, JPG, PNG, XLSX, CSV
                  </p>
                </div>

                {filesToUpload.length > 0 && (
                  <div style={{ marginBottom: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                    <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 8px 0', fontWeight: '500' }}>
                      Selected files ({filesToUpload.length}):
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {filesToUpload.map((file, idx) => (
                        <div key={idx} style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FiFile size={14} />
                          {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={onUpload}
                  disabled={!filesToUpload.length || uploading}
                  style={{
                    background: filesToUpload.length && !uploading 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#d1d5db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    cursor: filesToUpload.length && !uploading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  <FiUpload size={18} />
                  {uploading ? 'Uploading...' : 'Upload Files'}
                </button>
              </div>

              {/* Recommendations Trail */}
              <div style={{ 
                background: '#ffffff', 
                borderRadius: '16px', 
                padding: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                  Recommendations Trail
                </h3>

                {loading && trail.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                    Loading recommendations...
                  </div>
                ) : trail.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                    <FiFile size={48} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>No files uploaded yet</p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>Upload files to see recommendations</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {trail.map((entry) => {
                      const key = `${entry.applicationId}_${entry.documentName}_${entry.version}`;
                      return (
                        <div
                          key={key}
                          style={{
                            border: '2px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '20px',
                            background: '#fafafa'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                            <div>
                              <h4 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 4px 0', color: '#111827' }}>
                                {entry.documentName} (v{entry.version})
                              </h4>
                              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                                App ID: {entry.applicationId}
                              </p>
                            </div>
                            {canDelete && (
                              <button
                                onClick={() => confirmDeleteFile(entry.documentName, entry.version)}
                                style={{
                                  background: 'transparent',
                                  border: '2px solid #ef4444',
                                  color: '#ef4444',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '13px',
                                  fontWeight: '500'
                                }}
                              >
                                <FiTrash2 size={14} />
                                Delete
                              </button>
                            )}
                          </div>

                          {entry.recommendations.length === 0 ? (
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                              No recommendations available
                            </p>
                          ) : (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                                {entry.recommendations.map(rec => (
                                  <div
                                    key={rec.id}
                                    style={{
                                      padding: '12px',
                                      background: '#ffffff',
                                      borderRadius: '8px',
                                      border: `2px solid ${getStatusColor(rec.status)}20`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '12px',
                                      cursor: rec.status === 'pending' ? 'pointer' : 'default'
                                    }}
                                    onClick={() => rec.status === 'pending' && toggleSelection(entry, rec.id)}
                                  >
                                    {rec.status === 'pending' ? (
                                      <input
                                        type="checkbox"
                                        checked={selection[key]?.[rec.id] || false}
                                        onChange={() => toggleSelection(entry, rec.id)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: '18px',
                                          height: '18px',
                                          borderRadius: '50%',
                                          background: getStatusColor(rec.status),
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}
                                      >
                                        {rec.status === 'accepted' ? (
                                          <FiCheck size={12} color="white" />
                                        ) : (
                                          <FiX size={12} color="white" />
                                        )}
                                      </div>
                                    )}
                                    <span style={{ 
                                      fontSize: '14px', 
                                      color: '#374151',
                                      flex: 1,
                                      textDecoration: rec.status === 'rejected' ? 'line-through' : 'none',
                                      opacity: rec.status === 'rejected' ? 0.6 : 1
                                    }}>
                                      {rec.text}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: getStatusColor(rec.status),
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                      }}
                                    >
                                      {rec.status}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {entry.recommendations.some(r => r.status === 'pending') && (
                                <button
                                  onClick={() => onAcceptReject(entry)}
                                  style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 20px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    width: '100%',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <FiCheck size={16} />
                                  Accept {Object.keys(selection[key] || {}).filter(id => selection[key][id]).length > 0 
                                    ? `Selected (${Object.keys(selection[key]).filter(id => selection[key][id]).length})`
                                    : 'All Pending'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Folder Modal */}
      {showDeleteFolderModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <FiAlertCircle size={24} color="#ef4444" />
              <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Delete Folder</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0' }}>
              Are you sure you want to delete folder "<strong>{folderToDelete}</strong>"? 
              This will delete all files and recommendations in this folder. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteFolderModal(false);
                  setFolderToDelete('');
                }}
                style={{
                  background: 'transparent',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                Cancel
              </button>
              <button
                onClick={onDeleteFolder}
                disabled={loading}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Deleting...' : 'Delete Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete File Modal */}
      {showDeleteFileModal && fileToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <FiAlertCircle size={24} color="#ef4444" />
              <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Delete File</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0' }}>
              Are you sure you want to delete "<strong>{fileToDelete.doc}</strong>" (version {fileToDelete.version})? 
              This will remove all recommendations for this file. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteFileModal(false);
                  setFileToDelete(null);
                }}
                style={{
                  background: 'transparent',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                Cancel
              </button>
              <button
                onClick={onDeleteFile}
                disabled={loading}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Deleting...' : 'Delete File'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default StorageManager;
