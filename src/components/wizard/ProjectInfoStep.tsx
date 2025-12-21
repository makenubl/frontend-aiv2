/**
 * Project Info Step
 * 
 * Step 1 of the wizard - Enter project details or select existing project
 */

import React, { useState, useEffect } from 'react';
import { storageApi } from '../../services/api';

// Storage folder - the API returns just folder names as strings
interface StorageFolder {
  name: string;
}

interface ProjectInfoData {
  name: string;
  description?: string;
  tags?: string[];
  existingProjectId?: string;
  existingFolderName?: string;
  isExisting?: boolean;
}

interface ProjectInfoStepProps {
  initialData?: ProjectInfoData;
  onNext: (data: ProjectInfoData) => void;
  onCancel: () => void;
}

export const ProjectInfoStep: React.FC<ProjectInfoStepProps> = ({
  initialData,
  onNext,
  onCancel,
}) => {
  const [mode, setMode] = useState<'create' | 'existing'>(initialData?.isExisting ? 'existing' : 'create');
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<{ name?: string; project?: string }>({});
  
  // Existing projects (storage folders)
  const [existingProjects, setExistingProjects] = useState<StorageFolder[]>([]);
  const [selectedProject, setSelectedProject] = useState<StorageFolder | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load existing projects when switching to existing mode
  useEffect(() => {
    if (mode === 'existing' && existingProjects.length === 0) {
      loadExistingProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const loadExistingProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await storageApi.listFolders();
      // API returns folders as string array, convert to objects
      const folderNames: string[] = response.data.folders || [];
      const folders: StorageFolder[] = folderNames.map(name => ({ name }));
      setExistingProjects(folders);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const filteredProjects = existingProjects.filter(project => 
    project.name && project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = () => {
    if (mode === 'create') {
      const newErrors: { name?: string } = {};
      
      if (!name.trim()) {
        newErrors.name = 'Project name is required';
      } else if (name.trim().length < 3) {
        newErrors.name = 'Project name must be at least 3 characters';
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      
      onNext({ name: name.trim(), description: description.trim(), tags, isExisting: false });
    } else {
      if (!selectedProject) {
        setErrors({ project: 'Please select a project' });
        return;
      }
      
      onNext({ 
        name: selectedProject.name, 
        description: '',
        tags: [],
        existingProjectId: selectedProject.name, // Use folder name as ID
        existingFolderName: selectedProject.name,
        isExisting: true
      });
    }
  };

  return (
    <div className="wizard-step-content project-info-step">
      <div className="step-header" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div className="step-icon" style={{
          width: '72px',
          height: '72px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25))',
          border: '2px solid rgba(99, 102, 241, 0.4)',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2)'
        }}>📋</div>
        <div className="step-header-text">
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: 700,
            color: '#f8fafc',
            letterSpacing: '-0.025em',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>Project Information</h2>
          <p style={{
            margin: 0,
            color: '#94a3b8',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>Create a new project or continue with an existing one</p>
        </div>
      </div>

      {/* Mode Toggle Tabs */}
      <div className="mode-toggle" style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '28px',
        padding: '6px',
        background: 'rgba(30, 41, 59, 0.6)',
        borderRadius: '14px',
        border: '1px solid rgba(71, 85, 105, 0.3)'
      }}>
        <button
          onClick={() => setMode('create')}
          style={{
            flex: 1,
            padding: '14px 20px',
            background: mode === 'create' 
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
              : 'transparent',
            border: 'none',
            borderRadius: '10px',
            color: mode === 'create' ? '#ffffff' : '#94a3b8',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          <span style={{ fontSize: '18px' }}>✨</span>
          Create New Project
        </button>
        <button
          onClick={() => setMode('existing')}
          style={{
            flex: 1,
            padding: '14px 20px',
            background: mode === 'existing' 
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
              : 'transparent',
            border: 'none',
            borderRadius: '10px',
            color: mode === 'existing' ? '#ffffff' : '#94a3b8',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          <span style={{ fontSize: '18px' }}>📂</span>
          Select Existing Project
        </button>
      </div>

      {/* Create New Project Form */}
      {mode === 'create' && (
        <div className="form-container" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.6))',
          padding: '28px',
          borderRadius: '20px',
          border: '1px solid rgba(71, 85, 105, 0.3)'
        }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label htmlFor="project-name" style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#e2e8f0',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Project Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({});
              }}
              placeholder="Enter project name..."
              autoFocus
              style={{
                padding: '16px 18px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: errors.name ? '2px solid #ef4444' : '2px solid rgba(71, 85, 105, 0.4)',
                borderRadius: '12px',
                color: '#f1f5f9',
                fontSize: '15px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
            />
            {errors.name && <span style={{ color: '#ef4444', fontSize: '13px' }}>{errors.name}</span>}
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label htmlFor="project-description" style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#e2e8f0',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>Description</label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project (optional)..."
              rows={4}
              style={{
                padding: '16px 18px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '2px solid rgba(71, 85, 105, 0.4)',
                borderRadius: '12px',
                color: '#f1f5f9',
                fontSize: '15px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                outline: 'none',
                resize: 'vertical',
                minHeight: '100px',
                transition: 'all 0.2s ease'
              }}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#e2e8f0',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>Tags</label>
            <div className="tags-input-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="tags-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '32px' }}>
                {tags.map(tag => (
                  <span key={tag} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25))',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#c7d2fe'
                  }}>
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} style={{
                      background: 'none',
                      border: 'none',
                      color: '#a5b4fc',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '16px',
                      lineHeight: 1,
                      transition: 'color 0.2s ease'
                    }}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="tag-input-row" style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a tag..."
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '2px solid rgba(71, 85, 105, 0.4)',
                    borderRadius: '12px',
                    color: '#f1f5f9',
                    fontSize: '14px',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    outline: 'none'
                  }}
                />
                <button onClick={handleAddTag} disabled={!tagInput.trim()} style={{
                  padding: '14px 24px',
                  background: tagInput.trim() ? 'rgba(99, 102, 241, 0.2)' : 'rgba(71, 85, 105, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '12px',
                  color: tagInput.trim() ? '#a5b4fc' : '#64748b',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: tagInput.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  opacity: tagInput.trim() ? 1 : 0.5
                }}>
                  Add
                </button>
              </div>
            </div>
            <span style={{ color: '#64748b', fontSize: '12px' }}>Press Enter or click Add to add tags</span>
          </div>
        </div>
      )}

      {/* Select Existing Project */}
      {mode === 'existing' && (
        <div className="existing-projects-container" style={{
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.6))',
          padding: '28px',
          borderRadius: '20px',
          border: '1px solid rgba(71, 85, 105, 0.3)'
        }}>
          {/* Search */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px',
                opacity: 0.5
              }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                style={{
                  width: '100%',
                  padding: '16px 18px 16px 48px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '2px solid rgba(71, 85, 105, 0.4)',
                  borderRadius: '12px',
                  color: '#f1f5f9',
                  fontSize: '15px',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {errors.project && (
            <div style={{
              padding: '14px 18px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              marginBottom: '16px',
              color: '#fca5a5',
              fontSize: '14px'
            }}>
              {errors.project}
            </div>
          )}

          {/* Projects List */}
          {loadingProjects ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              color: '#94a3b8'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid rgba(99, 102, 241, 0.2)',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }} />
              <p style={{ margin: 0, fontSize: '15px' }}>Loading projects...</p>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              color: '#94a3b8'
            }}>
              <span style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📁</span>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>
                {searchQuery ? 'No projects match your search' : 'No existing projects found'}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#64748b' }}>
                {searchQuery ? 'Try a different search term' : 'Create a new project to get started'}
              </p>
            </div>
          ) : (
            <div className="projects-list" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '400px',
              overflowY: 'auto',
              paddingRight: '8px'
            }}>
              {filteredProjects.map(project => (
                <div
                  key={project.name}
                  onClick={() => {
                    setSelectedProject(project);
                    setErrors({});
                  }}
                  style={{
                    padding: '20px',
                    background: selectedProject?.name === project.name
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15))'
                      : 'rgba(30, 41, 59, 0.5)',
                    border: selectedProject?.name === project.name
                      ? '2px solid rgba(99, 102, 241, 0.5)'
                      : '1px solid rgba(71, 85, 105, 0.3)',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '24px' }}>📁</span>
                        <h4 style={{
                          margin: 0,
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#f1f5f9',
                          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}>{project.name.replace('Project_', '')}</h4>
                      </div>
                    </div>
                    {selectedProject?.name === project.name && (
                      <div style={{
                        width: '28px',
                        height: '28px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <span style={{ color: 'white', fontSize: '14px' }}>✓</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="step-actions" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid rgba(71, 85, 105, 0.3)'
      }}>
        <button onClick={onCancel} style={{
          padding: '16px 28px',
          background: 'rgba(71, 85, 105, 0.2)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          borderRadius: '12px',
          color: '#94a3b8',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          Cancel
        </button>
        <button onClick={handleSubmit} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '16px 32px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none',
          borderRadius: '12px',
          color: 'white',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          Next: Upload Files
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px' }}>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ProjectInfoStep;
