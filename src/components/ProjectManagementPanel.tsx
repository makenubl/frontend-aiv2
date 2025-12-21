/**
 * Project Management Panel
 * 
 * Comprehensive view for managing projects created by the Project Tracker Wizard:
 * - View/edit projects, tasks, and assignments
 * - Complete audit trail showing who created what and when
 * - AI activity tracking (task extraction, etc.)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getProjects,
  getProjectTasks,
  updateTask,
  getProjectAuditLogs,
  getVendors,
  getExternals,
  Project,
  Task,
  AuditLogEntry,
  Vendor,
  ExternalEmployee,
  getPriorityColor,
} from '../services/projectTracker';
import { usePermissions } from '../hooks/usePermissions';

interface ProjectManagementPanelProps {
  onBack?: () => void;
}

export const ProjectManagementPanel: React.FC<ProjectManagementPanelProps> = ({ onBack }) => {
  const permissions = usePermissions();
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [externals, setExternals] = useState<ExternalEmployee[]>([]);
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'audit'>('tasks');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Task editing
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'not-started' | 'in-progress' | 'completed' | 'blocked'>('all');
  
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading projects...');
      const projectList = await getProjects();
      console.log('Projects loaded:', projectList);
      setProjects(projectList);
      if (projectList.length > 0 && !selectedProject) {
        setSelectedProject(projectList[0]);
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError(err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject]);
  
  const loadAssignees = useCallback(async () => {
    try {
      const [vendorList, externalList] = await Promise.all([
        getVendors(),
        getExternals(),
      ]);
      setVendors(vendorList);
      setExternals(externalList);
    } catch (err) {
      console.error('Failed to load assignees:', err);
    }
  }, []);
  
  const loadProjectData = useCallback(async (projectId: string) => {
    try {
      console.log('Loading project data for:', projectId);
      const [taskList, logs] = await Promise.all([
        getProjectTasks(projectId),
        permissions.canViewAudit ? getProjectAuditLogs(projectId) : Promise.resolve([]),
      ]);
      console.log('Tasks loaded:', taskList);
      console.log('Audit logs loaded:', logs);
      setTasks(taskList);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Failed to load project data:', err);
    }
  }, [permissions.canViewAudit]);
  
  // Load initial data
  useEffect(() => {
    loadProjects();
    loadAssignees();
  }, [loadProjects, loadAssignees]);
  
  // Load tasks and audit when project changes
  useEffect(() => {
    if (selectedProject) {
      loadProjectData(selectedProject.projectId);
    }
  }, [selectedProject, loadProjectData]);
  
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTask(taskId, updates);
      // Refresh tasks
      if (selectedProject) {
        const taskList = await getProjectTasks(selectedProject.projectId);
        setTasks(taskList);
        // Refresh audit log
        if (permissions.canViewAudit) {
          const logs = await getProjectAuditLogs(selectedProject.projectId);
          setAuditLogs(logs);
        }
      }
      setEditingTask(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
    }
  };
  
  const getAssigneeName = (task: Task): string => {
    if (!task.ownerId || task.ownerType === 'internal') {
      return task.ownerName || 'Unassigned';
    }
    if (task.ownerType === 'vendor') {
      const vendor = vendors.find(v => v._id === task.ownerId || v.vendorId === task.ownerId);
      return vendor ? `${vendor.name} (${vendor.company})` : task.ownerName || 'Unknown';
    }
    if (task.ownerType === 'external') {
      const external = externals.find(e => e._id === task.ownerId || e.externalId === task.ownerId);
      return external ? `${external.name} (${external.organization || external.company})` : task.ownerName || 'Unknown';
    }
    return task.ownerName || 'Unassigned';
  };
  
  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'all') return true;
    return task.status === taskFilter;
  });
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  const getActionIcon = (action: string): string => {
    if (action.includes('create')) return '✨';
    if (action.includes('update')) return '📝';
    if (action.includes('delete')) return '🗑️';
    if (action.includes('assign')) return '👤';
    if (action.includes('ai') || action.includes('extract')) return '🤖';
    if (action.includes('upload')) return '📤';
    if (action.includes('finalize')) return '✅';
    return '📋';
  };
  
  const getActionLabel = (log: AuditLogEntry): string => {
    const action = log.action.toLowerCase();
    if (action.includes('project.created')) return 'Project Created';
    if (action.includes('project.updated')) return 'Project Updated';
    if (action.includes('project.finalized')) return 'Project Finalized';
    if (action.includes('task.created')) return 'Task Created';
    if (action.includes('task.updated')) return 'Task Updated';
    if (action.includes('task.assigned')) return 'Task Assigned';
    if (action.includes('file.uploaded')) return 'File Uploaded';
    if (action.includes('ai.analysis')) return 'AI Analysis';
    if (action.includes('ai.extraction')) return 'AI Task Extraction';
    return log.action.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const getActorBadge = (log: AuditLogEntry) => {
    const colors: Record<string, { bg: string; text: string }> = {
      ai: { bg: 'rgba(139, 92, 246, 0.3)', text: '#a78bfa' },
      system: { bg: 'rgba(107, 114, 128, 0.3)', text: '#9ca3af' },
      internal: { bg: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa' },
      vendor: { bg: 'rgba(34, 197, 94, 0.3)', text: '#4ade80' },
      external: { bg: 'rgba(249, 115, 22, 0.3)', text: '#fb923c' },
    };
    const style = colors[log.actorType] || colors.internal;
    return (
      <span style={{ 
        padding: '2px 8px', 
        borderRadius: '12px', 
        fontSize: '11px',
        background: style.bg, 
        color: style.text 
      }}>
        {log.actorType === 'ai' ? '🤖 AI' : log.actorName}
      </span>
    );
  };

  if (!permissions.canViewProjects) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        color: 'var(--text-primary)',
      }}>
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You don't have permission to view project management.</p>
        {onBack && (
          <button 
            onClick={onBack}
            style={{
              padding: '10px 20px',
              background: 'var(--premium-gradient)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'transparent',
      color: 'var(--text-primary)',
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 32px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {onBack && (
            <button 
              onClick={onBack} 
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '10px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Project Tracker
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              View and manage projects, tasks, and audit trails
            </p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        {/* Project Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          padding: '16px 20px',
          background: 'var(--glass-bg)',
          borderRadius: '12px',
          border: '1px solid var(--glass-border)',
        }}>
          <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Select Project:
          </label>
          <select
            value={selectedProject?.projectId || ''}
            onChange={(e) => {
              const project = projects.find(p => p.projectId === e.target.value);
              console.log('Selected project:', project);
              setSelectedProject(project || null);
            }}
            style={{
              flex: 1,
              maxWidth: '400px',
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            {projects.length === 0 && <option value="">No projects found</option>}
            {projects.map(project => (
              <option 
                key={project.projectId} 
                value={project.projectId}
                style={{ background: '#1a1f35', color: '#fff' }}
              >
                {project.name} ({project.status})
              </option>
            ))}
          </select>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} available
          </span>
        </div>

        {selectedProject && (
          <>
            {/* Project Overview */}
            <div style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedProject.name}
                </h2>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  background: selectedProject.status === 'active' 
                    ? 'rgba(34, 197, 94, 0.2)' 
                    : selectedProject.status === 'completed'
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'rgba(107, 114, 128, 0.2)',
                  color: selectedProject.status === 'active' 
                    ? '#4ade80' 
                    : selectedProject.status === 'completed'
                    ? '#60a5fa'
                    : '#9ca3af',
                }}>
                  {selectedProject.status}
                </span>
              </div>
              {selectedProject.description && (
                <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {selectedProject.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: '32px' }}>
                <div>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedProject.taskSummary?.total || 0}
                  </span>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>Total Tasks</span>
                </div>
                <div>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#4ade80' }}>
                    {selectedProject.taskSummary?.completed || 0}
                  </span>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>Completed</span>
                </div>
                <div>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#60a5fa' }}>
                    {selectedProject.taskSummary?.inProgress || 0}
                  </span>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>In Progress</span>
                </div>
                <div>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#f87171' }}>
                    {selectedProject.taskSummary?.blocked || 0}
                  </span>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>Blocked</span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={() => setActiveTab('tasks')}
                style={{
                  padding: '10px 20px',
                  background: activeTab === 'tasks' ? 'var(--premium-gradient)' : 'var(--glass-bg)',
                  border: activeTab === 'tasks' ? 'none' : '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                📋 Tasks & Actions
              </button>
              {permissions.canViewAudit && (
                <button
                  onClick={() => setActiveTab('audit')}
                  style={{
                    padding: '10px 20px',
                    background: activeTab === 'audit' ? 'var(--premium-gradient)' : 'var(--glass-bg)',
                    border: activeTab === 'audit' ? 'none' : '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  📜 Audit Trail
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '24px',
            }}>
              {activeTab === 'tasks' && (
                <div>
                  {/* Task Filters */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                    {(['all', 'not-started', 'in-progress', 'completed', 'blocked'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setTaskFilter(filter)}
                        style={{
                          padding: '6px 14px',
                          background: taskFilter === filter ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                          border: taskFilter === filter ? '1px solid rgba(102, 126, 234, 0.5)' : '1px solid transparent',
                          borderRadius: '20px',
                          fontSize: '13px',
                          color: taskFilter === filter ? '#a78bfa' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {filter === 'all' ? 'All' : filter.replace('-', ' ')} ({
                          filter === 'all' 
                            ? tasks.length 
                            : tasks.filter(t => t.status === filter).length
                        })
                      </button>
                    ))}
                  </div>

                  {/* Tasks List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredTasks.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No tasks found
                      </div>
                    ) : (
                      filteredTasks.map(task => (
                        <div 
                          key={task.taskId} 
                          style={{
                            padding: '16px 20px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span 
                                style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%',
                                  background: getPriorityColor(task.priority),
                                }} 
                              />
                              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                {task.title}
                              </h3>
                              {task.aiExtracted && (
                                <span 
                                  style={{ 
                                    padding: '2px 8px', 
                                    background: 'rgba(139, 92, 246, 0.2)', 
                                    borderRadius: '12px', 
                                    fontSize: '11px', 
                                    color: '#a78bfa' 
                                  }}
                                  title={`AI Confidence: ${Math.round((task.aiConfidence || 0) * 100)}%`}
                                >
                                  🤖 AI
                                </span>
                              )}
                            </div>
                            {permissions.canManageTasks && (
                              <button
                                onClick={() => setEditingTask(task)}
                                style={{
                                  padding: '6px 12px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid var(--glass-border)',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: '#a78bfa',
                                  cursor: 'pointer',
                                }}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                          {task.description && (
                            <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              {task.description}
                            </p>
                          )}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              textTransform: 'capitalize',
                              background: task.status === 'completed' 
                                ? 'rgba(34, 197, 94, 0.2)' 
                                : task.status === 'in-progress'
                                ? 'rgba(59, 130, 246, 0.2)'
                                : task.status === 'blocked'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : 'rgba(107, 114, 128, 0.2)',
                              color: task.status === 'completed' 
                                ? '#4ade80' 
                                : task.status === 'in-progress'
                                ? '#60a5fa'
                                : task.status === 'blocked'
                                ? '#f87171'
                                : '#9ca3af',
                            }}>
                              {task.status.replace('-', ' ')}
                            </span>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                              👤 {getAssigneeName(task)}
                            </span>
                            {task.dueDate && (
                              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                📅 {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'audit' && permissions.canViewAudit && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Activity Timeline
                    </h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {auditLogs.length} entries
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {auditLogs.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No audit logs found
                      </div>
                    ) : (
                      auditLogs.map((log, index) => (
                        <div 
                          key={log.logId || index} 
                          style={{
                            display: 'flex',
                            gap: '16px',
                            padding: '16px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '12px',
                          }}
                        >
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            flexShrink: 0,
                          }}>
                            {getActionIcon(log.action)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                {getActionLabel(log)}
                              </span>
                              {getActorBadge(log)}
                            </div>
                            {log.description && (
                              <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {log.description}
                              </p>
                            )}
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {formatDate(log.timestamp)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {isLoading && (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--glass-border)',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading projects...</p>
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <p style={{ margin: 0, color: '#f87171', fontSize: '14px' }}>{error}</p>
            <button 
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#f87171',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Task Edit Modal */}
      {editingTask && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setEditingTask(null)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '600px',
              background: 'linear-gradient(145deg, rgba(30, 35, 60, 0.95), rgba(20, 25, 45, 0.98))',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid var(--glass-border)',
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Edit Task
              </h3>
              <button 
                onClick={() => setEditingTask(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  borderRadius: '6px',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <TaskEditForm
                task={editingTask}
                vendors={vendors}
                externals={externals}
                onSave={(updates) => handleUpdateTask(editingTask.taskId, updates)}
                onCancel={() => setEditingTask(null)}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Task Edit Form Component
interface TaskEditFormProps {
  task: Task;
  vendors: Vendor[];
  externals: ExternalEmployee[];
  onSave: (updates: Partial<Task>) => void;
  onCancel: () => void;
}

const TaskEditForm: React.FC<TaskEditFormProps> = ({
  task,
  vendors,
  externals,
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate?.split('T')[0] || '');
  const [ownerId, setOwnerId] = useState(task.ownerId || '');
  const [ownerType, setOwnerType] = useState<'internal' | 'external' | 'vendor'>(task.ownerType || 'internal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let ownerName = 'Unassigned';
    if (ownerType === 'vendor') {
      const vendor = vendors.find(v => v._id === ownerId || v.vendorId === ownerId);
      ownerName = vendor?.name || 'Unknown';
    } else if (ownerType === 'external') {
      const external = externals.find(ex => ex._id === ownerId || ex.externalId === ownerId);
      ownerName = external?.name || 'Unknown';
    }

    onSave({
      title,
      description,
      status,
      priority,
      dueDate: dueDate || undefined,
      ownerId,
      ownerName,
      ownerType,
    });
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Status</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value as any)}
            style={inputStyle}
          >
            <option value="not-started" style={{ background: '#1a1f35' }}>Not Started</option>
            <option value="in-progress" style={{ background: '#1a1f35' }}>In Progress</option>
            <option value="completed" style={{ background: '#1a1f35' }}>Completed</option>
            <option value="blocked" style={{ background: '#1a1f35' }}>Blocked</option>
            <option value="cancelled" style={{ background: '#1a1f35' }}>Cancelled</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Priority</label>
          <select 
            value={priority} 
            onChange={(e) => setPriority(e.target.value as any)}
            style={inputStyle}
          >
            <option value="low" style={{ background: '#1a1f35' }}>Low</option>
            <option value="medium" style={{ background: '#1a1f35' }}>Medium</option>
            <option value="high" style={{ background: '#1a1f35' }}>High</option>
            <option value="critical" style={{ background: '#1a1f35' }}>Critical</option>
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Assignee Type</label>
          <select
            value={ownerType}
            onChange={(e) => {
              setOwnerType(e.target.value as any);
              setOwnerId('');
            }}
            style={inputStyle}
          >
            <option value="internal" style={{ background: '#1a1f35' }}>Internal</option>
            <option value="vendor" style={{ background: '#1a1f35' }}>Vendor</option>
            <option value="external" style={{ background: '#1a1f35' }}>External</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Assignee</label>
          <select 
            value={ownerId} 
            onChange={(e) => setOwnerId(e.target.value)}
            style={inputStyle}
          >
            <option value="" style={{ background: '#1a1f35' }}>Unassigned</option>
            {ownerType === 'vendor' && vendors.map(v => (
              <option 
                key={v._id || v.vendorId} 
                value={v._id || v.vendorId}
                style={{ background: '#1a1f35' }}
              >
                {v.name} ({v.company})
              </option>
            ))}
            {ownerType === 'external' && externals.map(e => (
              <option 
                key={e._id || e.externalId} 
                value={e._id || e.externalId}
                style={{ background: '#1a1f35' }}
              >
                {e.name} ({e.organization || e.company})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
        <button 
          type="button" 
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button 
          type="submit"
          style={{
            padding: '10px 20px',
            background: 'var(--premium-gradient)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default ProjectManagementPanel;
