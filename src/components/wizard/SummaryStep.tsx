/**
 * Summary Step
 * 
 * Step 5 of the wizard - Review all data and finalize project
 */

import React, { useState } from 'react';
import {
  ProjectInfo,
  UploadedFile,
  ExtractedTask,
  Assignee,
  formatFileSize,
  getPriorityColor,
} from '../../services/projectTracker';

interface SummaryStepProps {
  projectInfo: ProjectInfo;
  uploadedFiles: UploadedFile[];
  extractedTasks: ExtractedTask[];
  assignees: Assignee[];
  storageFolderName?: string;
  onFinalize: () => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({
  projectInfo,
  uploadedFiles,
  extractedTasks,
  assignees,
  storageFolderName,
  onFinalize,
  onBack,
  isLoading,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('tasks');

  const assignedTasks = extractedTasks.filter(t => t.assignedTo);
  const unassignedTasks = extractedTasks.filter(t => !t.assignedTo);
  
  const tasksByType = {
    tasks: extractedTasks.filter(t => t.type === 'task'),
    actionItems: extractedTasks.filter(t => t.type === 'action_item'),
    deliverables: extractedTasks.filter(t => t.type === 'deliverable'),
    deadlines: extractedTasks.filter(t => t.type === 'deadline'),
  };
  
  const tasksByPriority = {
    critical: extractedTasks.filter(t => t.priority === 'critical'),
    high: extractedTasks.filter(t => t.priority === 'high'),
    medium: extractedTasks.filter(t => t.priority === 'medium'),
    low: extractedTasks.filter(t => t.priority === 'low'),
  };
  
  const getAssigneeName = (task: ExtractedTask): string | null => {
    if (!task.assignedTo) return null;
    const assignee = assignees.find(a => a.id === task.assignedTo);
    return assignee ? `${assignee.name} (${assignee.company})` : null;
  };

  const uniqueAssignees = new Set(assignedTasks.map(t => t.assignedTo));

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="wizard-step-content summary-step">
      <div className="step-header">
        <div className="step-icon">✨</div>
        <div className="step-header-text">
          <h2>Review & Finalize</h2>
          <p>Review your project details before creating</p>
        </div>
      </div>

      {/* Project Overview Card */}
      <div className="overview-card">
        <div className="overview-header">
          <h3>{projectInfo.name}</h3>
          {projectInfo.tags && projectInfo.tags.length > 0 && (
            <div className="tags-row">
              {projectInfo.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
        {projectInfo.description && (
          <p className="overview-description">{projectInfo.description}</p>
        )}
        
        {/* Storage Integration Info */}
        {storageFolderName && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15))',
            borderRadius: '8px',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '20px' }}>📂</span>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
                Storage Folder
              </div>
              <div style={{ fontWeight: 600, color: '#1f2937' }}>
                {storageFolderName}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#059669' }}>
              ✓ Synced with Storage & AI Chat
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-info">
            <span className="stat-value">{uploadedFiles.length}</span>
            <span className="stat-label">Documents</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <span className="stat-value">{extractedTasks.length}</span>
            <span className="stat-label">Items Extracted</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="stat-value">{assignedTasks.length}</span>
            <span className="stat-label">Assigned</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <span className="stat-value">{uniqueAssignees.size}</span>
            <span className="stat-label">Assignees</span>
          </div>
        </div>
      </div>

      {/* Expandable Sections */}
      <div className="summary-sections">
        {/* Documents Section */}
        <div className={`summary-section ${expandedSection === 'documents' ? 'expanded' : ''}`}>
          <div className="section-header" onClick={() => toggleSection('documents')}>
            <div className="section-title">
              <span className="section-icon">📁</span>
              <span>Documents ({uploadedFiles.length})</span>
            </div>
            <span className="section-meta">
              {formatFileSize(uploadedFiles.reduce((sum, f) => sum + f.size, 0))} total
            </span>
            <svg className="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          {expandedSection === 'documents' && (
            <div className="section-content">
              <div className="documents-grid">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="doc-item">
                    <span className="doc-name">{file.originalName}</span>
                    <span className="doc-size">{formatFileSize(file.size)}</span>
                    <span className="doc-tasks">{file.extractedTasksCount || 0} items</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tasks Section */}
        <div className={`summary-section ${expandedSection === 'tasks' ? 'expanded' : ''}`}>
          <div className="section-header" onClick={() => toggleSection('tasks')}>
            <div className="section-title">
              <span className="section-icon">📋</span>
              <span>Extracted Items ({extractedTasks.length})</span>
            </div>
            <span className="section-meta">
              {unassignedTasks.length} unassigned
            </span>
            <svg className="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          {expandedSection === 'tasks' && (
            <div className="section-content">
              {/* Type Breakdown */}
              <div className="breakdown-grid">
                <div className="breakdown-item">
                  <span className="breakdown-label">📋 Tasks</span>
                  <span className="breakdown-value">{tasksByType.tasks.length}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">✅ Action Items</span>
                  <span className="breakdown-value">{tasksByType.actionItems.length}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">📦 Deliverables</span>
                  <span className="breakdown-value">{tasksByType.deliverables.length}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">⏰ Deadlines</span>
                  <span className="breakdown-value">{tasksByType.deadlines.length}</span>
                </div>
              </div>

              {/* Priority Breakdown */}
              <h4 className="breakdown-title">By Priority</h4>
              <div className="priority-bars">
                {tasksByPriority.critical.length > 0 && (
                  <div className="priority-bar">
                    <span className="priority-label" style={{ color: getPriorityColor('critical') }}>
                      Critical
                    </span>
                    <div className="bar-container">
                      <div 
                        className="bar" 
                        style={{ 
                          width: `${(tasksByPriority.critical.length / extractedTasks.length) * 100}%`,
                          background: getPriorityColor('critical')
                        }}
                      />
                    </div>
                    <span className="priority-count">{tasksByPriority.critical.length}</span>
                  </div>
                )}
                {tasksByPriority.high.length > 0 && (
                  <div className="priority-bar">
                    <span className="priority-label" style={{ color: getPriorityColor('high') }}>
                      High
                    </span>
                    <div className="bar-container">
                      <div 
                        className="bar" 
                        style={{ 
                          width: `${(tasksByPriority.high.length / extractedTasks.length) * 100}%`,
                          background: getPriorityColor('high')
                        }}
                      />
                    </div>
                    <span className="priority-count">{tasksByPriority.high.length}</span>
                  </div>
                )}
                {tasksByPriority.medium.length > 0 && (
                  <div className="priority-bar">
                    <span className="priority-label" style={{ color: getPriorityColor('medium') }}>
                      Medium
                    </span>
                    <div className="bar-container">
                      <div 
                        className="bar" 
                        style={{ 
                          width: `${(tasksByPriority.medium.length / extractedTasks.length) * 100}%`,
                          background: getPriorityColor('medium')
                        }}
                      />
                    </div>
                    <span className="priority-count">{tasksByPriority.medium.length}</span>
                  </div>
                )}
                {tasksByPriority.low.length > 0 && (
                  <div className="priority-bar">
                    <span className="priority-label" style={{ color: getPriorityColor('low') }}>
                      Low
                    </span>
                    <div className="bar-container">
                      <div 
                        className="bar" 
                        style={{ 
                          width: `${(tasksByPriority.low.length / extractedTasks.length) * 100}%`,
                          background: getPriorityColor('low')
                        }}
                      />
                    </div>
                    <span className="priority-count">{tasksByPriority.low.length}</span>
                  </div>
                )}
              </div>

              {/* Task List Preview */}
              <h4 className="breakdown-title">Items Preview</h4>
              <div className="tasks-preview">
                {extractedTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="task-preview-item">
                    <span 
                      className="task-priority-dot"
                      style={{ background: getPriorityColor(task.priority) }}
                    />
                    <span className="task-preview-title">{task.title}</span>
                    {getAssigneeName(task) && (
                      <span className="task-preview-assignee">
                        → {getAssigneeName(task)}
                      </span>
                    )}
                  </div>
                ))}
                {extractedTasks.length > 5 && (
                  <div className="tasks-more">
                    + {extractedTasks.length - 5} more items
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Assignments Section */}
        <div className={`summary-section ${expandedSection === 'assignments' ? 'expanded' : ''}`}>
          <div className="section-header" onClick={() => toggleSection('assignments')}>
            <div className="section-title">
              <span className="section-icon">👥</span>
              <span>Assignments ({assignedTasks.length})</span>
            </div>
            <span className="section-meta">
              {uniqueAssignees.size} people
            </span>
            <svg className="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          {expandedSection === 'assignments' && (
            <div className="section-content">
              {uniqueAssignees.size === 0 ? (
                <div className="no-assignments">
                  <p>No tasks have been assigned yet.</p>
                </div>
              ) : (
                <div className="assignees-list">
                  {Array.from(uniqueAssignees)
                    .filter(assigneeId => assignees.find(a => a.id === assigneeId))
                    .map(assigneeId => {
                      const assignee = assignees.find(a => a.id === assigneeId)!;
                      const assigneeTasks = assignedTasks.filter(t => t.assignedTo === assigneeId);
                      
                      return (
                        <div key={assigneeId} className="assignee-row">
                          <div className="assignee-info">
                            <div className="assignee-avatar">
                              {assignee.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="assignee-details">
                              <span className="assignee-name">{assignee.name}</span>
                              <span className="assignee-company">
                                {assignee.company} • {assignee.type === 'vendor' ? 'Vendor' : 'External'}
                              </span>
                            </div>
                          </div>
                          <div className="assignee-tasks-count">
                            {assigneeTasks.length} task{assigneeTasks.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Warning for unassigned tasks */}
      {unassignedTasks.length > 0 && (
        <div className="warning-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div className="warning-content">
            <strong>{unassignedTasks.length} items are unassigned</strong>
            <p>You can still create the project. Unassigned items can be assigned later.</p>
          </div>
        </div>
      )}

      <div className="step-actions">
        <button onClick={onBack} className="btn-secondary" disabled={isLoading}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          onClick={onFinalize}
          className="btn-finalize"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Creating Project...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              Create Project
            </>
          )}
        </button>
      </div>

      <style>{`
        .summary-step {
          max-width: 900px;
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
          color: #1f2937;
        }
        
        .step-header-text p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }
        
        /* Overview Card */
        .overview-card {
          padding: 24px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 16px;
          margin-bottom: 24px;
        }
        
        .overview-header h3 {
          margin: 0 0 8px 0;
          font-size: 22px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        
        .tag {
          padding: 4px 10px;
          background: rgba(102, 126, 234, 0.15);
          border-radius: 20px;
          font-size: 12px;
          color: #667eea;
        }
        
        .overview-description {
          margin: 12px 0 0 0;
          font-size: 14px;
          color: #4b5563;
          line-height: 1.6;
        }
        
        /* Quick Stats */
        .quick-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 768px) {
          .quick-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        }
        
        .stat-icon {
          font-size: 24px;
        }
        
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        
        .stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #1f2937;
        }
        
        .stat-label {
          font-size: 12px;
          color: #6b7280;
        }
        
        /* Summary Sections */
        .summary-sections {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        
        .summary-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
        }
        
        .summary-section.expanded {
          border-color: rgba(102, 126, 234, 0.5);
        }
        
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .section-header:hover {
          background: #f9fafb;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          font-size: 15px;
          font-weight: 500;
          color: #1f2937;
        }
        
        .section-icon {
          font-size: 18px;
        }
        
        .section-meta {
          font-size: 13px;
          color: #6b7280;
        }
        
        .expand-icon {
          width: 20px;
          height: 20px;
          color: #9ca3af;
          transition: transform 0.2s ease;
        }
        
        .summary-section.expanded .expand-icon {
          transform: rotate(180deg);
        }
        
        .section-content {
          padding: 0 20px 20px;
          border-top: 1px solid #f3f4f6;
          margin-top: 0;
        }
        
        /* Documents Grid */
        .documents-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 16px;
        }
        
        .doc-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: #f9fafb;
          border-radius: 8px;
        }
        
        .doc-name {
          flex: 1;
          font-size: 13px;
          color: #1f2937;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .doc-size {
          font-size: 12px;
          color: #6b7280;
        }
        
        .doc-tasks {
          font-size: 12px;
          color: rgba(102, 126, 234, 0.8);
        }
        
        /* Breakdown */
        .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding-top: 16px;
        }
        
        @media (max-width: 600px) {
          .breakdown-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .breakdown-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 10px;
          text-align: center;
        }
        
        .breakdown-label {
          font-size: 12px;
          color: #6b7280;
        }
        
        .breakdown-value {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
        }
        
        .breakdown-title {
          margin: 20px 0 12px;
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Priority Bars */
        .priority-bars {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .priority-bar {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .priority-label {
          width: 60px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .bar-container {
          flex: 1;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        
        .priority-count {
          width: 30px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          text-align: right;
        }
        
        /* Tasks Preview */
        .tasks-preview {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .task-preview-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #f9fafb;
          border-radius: 8px;
        }
        
        .task-priority-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .task-preview-title {
          flex: 1;
          font-size: 13px;
          color: #1f2937;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .task-preview-assignee {
          font-size: 12px;
          color: rgba(102, 126, 234, 0.8);
          white-space: nowrap;
        }
        
        .tasks-more {
          padding: 8px 14px;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }
        
        /* Assignees List */
        .no-assignments {
          padding: 20px;
          text-align: center;
          color: #6b7280;
        }
        
        .no-assignments p {
          margin: 0;
        }
        
        .assignees-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 16px;
        }
        
        .assignee-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: #f9fafb;
          border-radius: 10px;
        }
        
        .assignee-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .assignee-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          color: white;
        }
        
        .assignee-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .assignee-name {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
        }
        
        .assignee-company {
          font-size: 12px;
          color: #6b7280;
        }
        
        .assignee-tasks-count {
          font-size: 13px;
          color: rgba(102, 126, 234, 0.8);
          font-weight: 500;
        }
        
        /* Warning Banner */
        .warning-banner {
          display: flex;
          gap: 14px;
          padding: 16px 20px;
          background: rgba(234, 179, 8, 0.1);
          border: 1px solid rgba(234, 179, 8, 0.3);
          border-radius: 12px;
          margin-bottom: 24px;
        }
        
        .warning-banner svg {
          width: 24px;
          height: 24px;
          color: #eab308;
          flex-shrink: 0;
        }
        
        .warning-content strong {
          display: block;
          font-size: 14px;
          color: #92400e;
          margin-bottom: 4px;
        }
        
        .warning-content p {
          margin: 0;
          font-size: 13px;
          color: #a16207;
        }
        
        /* Step Actions */
        .step-actions {
          display: flex;
          justify-content: space-between;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }
        
        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          color: #374151;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-secondary:hover:not(:disabled) {
          background: #f9fafb;
        }
        
        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-secondary svg {
          width: 18px;
          height: 18px;
        }
        
        .btn-finalize {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 32px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-finalize:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
        }
        
        .btn-finalize:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .btn-finalize svg {
          width: 20px;
          height: 20px;
        }
        
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SummaryStep;
