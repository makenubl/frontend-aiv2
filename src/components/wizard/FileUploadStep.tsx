/**
 * File Upload Step
 * 
 * Step 2 of the wizard - Upload files and folders
 * with drag & drop support and file preview
 */

import React, { useState, useRef, useCallback } from 'react';
import { UploadedFile, formatFileSize, getFileIcon } from '../../services/projectTracker';

interface FileUploadStepProps {
  sessionId: string;
  uploadedFiles: UploadedFile[];
  onUpload: (files: File[]) => Promise<void>;
  onRemoveFile: (fileId: string) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  isUploading: boolean;
  uploadProgress: number;
}

export const FileUploadStep: React.FC<FileUploadStepProps> = ({
  sessionId,
  uploadedFiles,
  onUpload,
  onRemoveFile,
  onNext,
  onBack,
  isUploading,
  uploadProgress,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const items = e.dataTransfer.items;
    const files: File[] = [];

    // Handle both files and folders
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          await traverseFileTree(entry, files);
        } else {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    }

    if (files.length > 0) {
      try {
        await onUpload(files);
      } catch (err: any) {
        setError(err.message || 'Upload failed');
      }
    }
  }, [onUpload]);

  // Recursively traverse folder structure
  const traverseFileTree = async (entry: any, files: File[]): Promise<void> => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file: File) => {
          files.push(file);
          resolve();
        });
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      return new Promise((resolve) => {
        reader.readEntries(async (entries: any[]) => {
          for (const childEntry of entries) {
            await traverseFileTree(childEntry, files);
          }
          resolve();
        });
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError(null);
    
    if (files.length > 0) {
      try {
        await onUpload(files);
      } catch (err: any) {
        setError(err.message || 'Upload failed');
      }
    }
    
    // Reset input
    e.target.value = '';
  };

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
  };

  const handleBrowseFolders = () => {
    folderInputRef.current?.click();
  };

  const totalSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="wizard-step-content file-upload-step">
      <div className="step-header">
        <div className="step-icon">📁</div>
        <div className="step-header-text">
          <h2>Upload Documents</h2>
          <p>Upload files or folders to be analyzed by AI</p>
        </div>
      </div>

      {/* Storage Integration Note */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
        border: '1px solid rgba(102, 126, 234, 0.3)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ fontSize: '24px' }}>🔗</span>
        <div>
          <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
            Integrated with Storage & AI Chat
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            Files will be uploaded to S3 and available in Storage Manager for AI analysis and chat
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.json"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        {...{ webkitdirectory: '', directory: '' } as any}
      />

      {/* Drop zone */}
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="upload-progress">
            <div className="progress-icon">⏳</div>
            <div className="progress-text">Uploading files...</div>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
            </div>
            <div className="progress-percent">{uploadProgress}%</div>
          </div>
        ) : (
          <>
            <div className="drop-icon">
              <svg viewBox="0 0 64 64" fill="none">
                <rect x="8" y="16" width="48" height="40" rx="4" stroke="currentColor" strokeWidth="2" />
                <path d="M32 28v20M24 36l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="20" y="8" width="24" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <div className="drop-text">
              <span className="drop-title">Drop files or folders here</span>
              <span className="drop-subtitle">or</span>
            </div>
            <div className="browse-buttons">
              <button onClick={handleBrowseFiles} className="btn-browse">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Browse Files
              </button>
              <button onClick={handleBrowseFolders} className="btn-browse">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Browse Folders
              </button>
            </div>
            <div className="supported-formats">
              Supported: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, MD, JSON
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* File list */}
      {uploadedFiles.length > 0 && (
        <div className="files-section">
          <div className="files-header">
            <h3>Uploaded Files ({uploadedFiles.length})</h3>
            <span className="total-size">{formatFileSize(totalSize)} total</span>
          </div>
          <div className="files-list">
            {uploadedFiles.map(file => (
              <div key={file.id} className="file-item">
                <div className="file-icon">{getFileIcon(file.mimeType)}</div>
                <div className="file-info">
                  <span className="file-name">{file.originalName}</span>
                  <span className="file-meta">
                    {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="file-status">
                  {file.analysisStatus === 'pending' && (
                    <span className="status-badge pending">Ready</span>
                  )}
                  {file.analysisStatus === 'analyzing' && (
                    <span className="status-badge analyzing">Analyzing</span>
                  )}
                  {file.analysisStatus === 'completed' && (
                    <span className="status-badge completed">
                      {file.extractedTasksCount || 0} tasks
                    </span>
                  )}
                  {file.analysisStatus === 'error' && (
                    <span className="status-badge error">Error</span>
                  )}
                </div>
                <button
                  className="btn-remove"
                  onClick={() => onRemoveFile(file.id)}
                  title="Remove file"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="step-actions">
        <button onClick={onBack} className="btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          onClick={onNext}
          className="btn-primary"
          disabled={uploadedFiles.length === 0 || isUploading}
        >
          Next: AI Analysis
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <style>{`
        .file-upload-step {
          max-width: 800px;
          margin: 0 auto;
          padding: 32px;
        }
        
        .step-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 32px;
        }
        
        .step-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
        }
        
        .step-header-text h2 {
          margin: 0 0 4px 0;
          font-size: 24px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }
        
        .step-header-text p {
          margin: 0;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }
        
        .drop-zone {
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 48px 32px;
          text-align: center;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.02);
        }
        
        .drop-zone.dragging {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.1);
          transform: scale(1.01);
        }
        
        .drop-zone.uploading {
          border-color: rgba(255, 255, 255, 0.15);
          pointer-events: none;
        }
        
        .drop-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          color: rgba(255, 255, 255, 0.4);
        }
        
        .drop-icon svg {
          width: 100%;
          height: 100%;
        }
        
        .drop-text {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }
        
        .drop-title {
          font-size: 18px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
        }
        
        .drop-subtitle {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.4);
        }
        
        .browse-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 16px;
        }
        
        .btn-browse {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-browse:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        .btn-browse svg {
          width: 18px;
          height: 18px;
        }
        
        .supported-formats {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }
        
        .upload-progress {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        
        .progress-icon {
          font-size: 40px;
          animation: spin 2s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .progress-text {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.8);
        }
        
        .progress-bar-container {
          width: 300px;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        
        .progress-percent {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }
        
        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          color: #ef4444;
          font-size: 14px;
          margin-top: 16px;
        }
        
        .error-banner svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }
        
        .files-section {
          margin-top: 32px;
        }
        
        .files-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .files-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .total-size {
          font-size: 13px;
          color: #6b7280;
        }
        
        .files-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .file-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.2s ease;
          border-left: 4px solid #667eea;
        }
        
        .file-item:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }
        
        .file-icon {
          font-size: 24px;
        }
        
        .file-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        
        .file-name {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .file-meta {
          font-size: 12px;
          color: #6b7280;
        }
        
        .file-status {
          flex-shrink: 0;
        }
        
        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .status-badge.pending {
          background: #f3f4f6;
          color: #6b7280;
        }
        
        .status-badge.analyzing {
          background: rgba(102, 126, 234, 0.15);
          color: #667eea;
        }
        
        .status-badge.completed {
          background: rgba(34, 197, 94, 0.15);
          color: #16a34a;
        }
        
        .status-badge.error {
          background: rgba(239, 68, 68, 0.15);
          color: #dc2626;
        }
        
        .btn-remove {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        
        .btn-remove:hover {
          background: #fee2e2;
          color: #dc2626;
        }
        
        .btn-remove svg {
          width: 18px;
          height: 18px;
        }
        
        .step-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .btn-secondary svg {
          width: 18px;
          height: 18px;
        }
        
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        }
        
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-primary svg {
          width: 18px;
          height: 18px;
        }
      `}</style>
    </div>
  );
};

export default FileUploadStep;
