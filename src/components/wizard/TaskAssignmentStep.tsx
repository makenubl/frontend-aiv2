/**
 * Task Assignment Step
 * 
 * Step 4 of the wizard - Assign extracted tasks to
 * vendors, external employees, or team members
 */

import React, { useState } from 'react';
import {
  ExtractedTask,
  Vendor,
  ExternalEmployee,
  Assignee,
  getPriorityColor,
} from '../../services/projectTracker';

interface TaskAssignmentStepProps {
  extractedTasks: ExtractedTask[];
  vendors: Vendor[];
  externalEmployees: ExternalEmployee[];
  assignees: Assignee[];
  onCreateVendor: (vendor: Omit<Vendor, '_id' | 'createdAt' | 'status'>) => Promise<void>;
  onCreateExternal: (employee: Omit<ExternalEmployee, '_id' | 'createdAt' | 'status'>) => Promise<void>;
  onAssignTask: (taskId: string, assigneeId: string, assigneeType: 'vendor' | 'external') => void;
  onUpdateTaskPriority: (taskId: string, priority: 'low' | 'medium' | 'high' | 'critical') => void;
  onUpdateTaskDeadline: (taskId: string, deadline: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const TaskAssignmentStep: React.FC<TaskAssignmentStepProps> = ({
  extractedTasks,
  vendors,
  externalEmployees,
  assignees,
  onCreateVendor,
  onCreateExternal,
  onAssignTask,
  onUpdateTaskPriority,
  onUpdateTaskDeadline,
  onNext,
  onBack,
}) => {
  const [showAddModal, setShowAddModal] = useState<'vendor' | 'external' | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkAssignee, setBulkAssignee] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'task' | 'action_item' | 'deliverable' | 'deadline'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  // Form state for adding vendor/external
  const [vendorForm, setVendorForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    specialty: '',
  });
  const [externalForm, setExternalForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    role: '',
    company: '',
  });

  // Filter tasks
  const filteredTasks = extractedTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesType = typeFilter === 'all' || task.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesType && matchesPriority;
  });

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleBulkAssign = () => {
    if (!bulkAssignee) return;
    const [type, id] = bulkAssignee.split(':');
    selectedTasks.forEach(taskId => {
      onAssignTask(taskId, id, type as 'vendor' | 'external');
    });
    setSelectedTasks(new Set());
    setBulkAssignee('');
  };

  const handleCreateVendor = async () => {
    await onCreateVendor({
      name: vendorForm.name,
      company: vendorForm.company,
      email: vendorForm.email,
      phone: vendorForm.phone,
      specialty: vendorForm.specialty,
    });
    setVendorForm({ name: '', company: '', email: '', phone: '', specialty: '' });
    setShowAddModal(null);
  };

  const handleCreateExternal = async () => {
    await onCreateExternal({
      name: externalForm.name,
      email: externalForm.email,
      phone: externalForm.phone,
      department: externalForm.department,
      role: externalForm.role,
      company: externalForm.company,
    });
    setExternalForm({ name: '', email: '', phone: '', department: '', role: '', company: '' });
    setShowAddModal(null);
  };

  const getAssigneeById = (task: ExtractedTask): Assignee | undefined => {
    if (!task.assignedTo) return undefined;
    return assignees.find(a => a.id === task.assignedTo);
  };

  const assignedCount = extractedTasks.filter(t => t.assignedTo).length;

  return (
    <div className="wizard-step-content task-assignment-step">
      <div className="step-header">
        <div className="step-icon">👥</div>
        <div className="step-header-text">
          <h2>Assign Tasks</h2>
          <p>Assign extracted items to vendors or external employees</p>
        </div>
        <div className="assignment-progress">
          <div className="progress-ring">
            <svg viewBox="0 0 36 36">
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="3"
                strokeDasharray={`${(assignedCount / extractedTasks.length) * 100}, 100`}
              />
              <defs>
                <linearGradient id="gradient">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
            </svg>
            <span className="progress-text">{assignedCount}/{extractedTasks.length}</span>
          </div>
          <span className="progress-label">Assigned</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="assignment-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="task">Tasks</option>
            <option value="action_item">Action Items</option>
            <option value="deliverable">Deliverables</option>
            <option value="deadline">Deadlines</option>
          </select>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        
        <div className="toolbar-right">
          <button onClick={() => setShowAddModal('vendor')} className="btn-add">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Vendor
          </button>
          <button onClick={() => setShowAddModal('external')} className="btn-add">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add External
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTasks.size > 0 && (
        <div className="bulk-actions">
          <span className="bulk-count">{selectedTasks.size} selected</span>
          <select
            value={bulkAssignee}
            onChange={(e) => setBulkAssignee(e.target.value)}
            className="bulk-select"
          >
            <option value="">Assign to...</option>
            <optgroup label="Vendors">
              {vendors.map(v => (
                <option key={v._id} value={`vendor:${v._id}`}>
                  {v.name} ({v.company})
                </option>
              ))}
            </optgroup>
            <optgroup label="External Employees">
              {externalEmployees.map(e => (
                <option key={e._id} value={`external:${e._id}`}>
                  {e.name} ({e.company})
                </option>
              ))}
            </optgroup>
          </select>
          <button
            onClick={handleBulkAssign}
            disabled={!bulkAssignee}
            className="btn-bulk-assign"
          >
            Assign
          </button>
          <button
            onClick={() => setSelectedTasks(new Set())}
            className="btn-clear"
          >
            Clear
          </button>
        </div>
      )}

      {/* Task List */}
      <div className="tasks-table-container">
        <table className="tasks-table">
          <thead>
            <tr>
              <th className="col-check">
                <input
                  type="checkbox"
                  checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="col-task">Task</th>
              <th className="col-type">Type</th>
              <th className="col-priority">Priority</th>
              <th className="col-deadline">Deadline</th>
              <th className="col-assignee">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                selected={selectedTasks.has(task.id)}
                onSelect={() => toggleTaskSelection(task.id)}
                assignee={getAssigneeById(task)}
                assignees={assignees}
                onAssign={(assigneeId, type) => onAssignTask(task.id, assigneeId, type)}
                onUpdatePriority={(priority) => onUpdateTaskPriority(task.id, priority)}
                onUpdateDeadline={(deadline) => onUpdateTaskDeadline(task.id, deadline)}
              />
            ))}
          </tbody>
        </table>
        
        {filteredTasks.length === 0 && (
          <div className="empty-table">
            <p>No tasks match the current filters</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{showAddModal === 'vendor' ? 'Add New Vendor' : 'Add External Employee'}</h3>
              <button className="modal-close" onClick={() => setShowAddModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            {showAddModal === 'vendor' ? (
              <div className="modal-body">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    placeholder="Contact name"
                  />
                </div>
                <div className="form-group">
                  <label>Company *</label>
                  <input
                    type="text"
                    value={vendorForm.company}
                    onChange={(e) => setVendorForm({ ...vendorForm, company: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      placeholder="email@company.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Specialty</label>
                  <input
                    type="text"
                    value={vendorForm.specialty}
                    onChange={(e) => setVendorForm({ ...vendorForm, specialty: e.target.value })}
                    placeholder="e.g., Software Development, Design"
                  />
                </div>
              </div>
            ) : (
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={externalForm.name}
                      onChange={(e) => setExternalForm({ ...externalForm, name: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Company *</label>
                    <input
                      type="text"
                      value={externalForm.company}
                      onChange={(e) => setExternalForm({ ...externalForm, company: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={externalForm.email}
                      onChange={(e) => setExternalForm({ ...externalForm, email: e.target.value })}
                      placeholder="email@company.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={externalForm.phone}
                      onChange={(e) => setExternalForm({ ...externalForm, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      value={externalForm.department}
                      onChange={(e) => setExternalForm({ ...externalForm, department: e.target.value })}
                      placeholder="e.g., Engineering, Marketing"
                    />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <input
                      type="text"
                      value={externalForm.role}
                      onChange={(e) => setExternalForm({ ...externalForm, role: e.target.value })}
                      placeholder="e.g., Project Manager"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="modal-footer">
              <button onClick={() => setShowAddModal(null)} className="btn-cancel">
                Cancel
              </button>
              <button
                onClick={showAddModal === 'vendor' ? handleCreateVendor : handleCreateExternal}
                className="btn-save"
                disabled={
                  showAddModal === 'vendor'
                    ? !vendorForm.name || !vendorForm.company || !vendorForm.email
                    : !externalForm.name || !externalForm.company || !externalForm.email
                }
              >
                Add {showAddModal === 'vendor' ? 'Vendor' : 'Employee'}
              </button>
            </div>
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
        <button onClick={onNext} className="btn-primary">
          Review & Finalize
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <style>{`
        .task-assignment-step {
          max-width: 1100px;
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
        
        .step-header-text {
          flex: 1;
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
        
        .assignment-progress {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        
        .progress-ring {
          position: relative;
          width: 50px;
          height: 50px;
        }
        
        .progress-ring svg {
          transform: rotate(-90deg);
          width: 100%;
          height: 100%;
        }
        
        .progress-text {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .progress-label {
          font-size: 11px;
          color: #6b7280;
        }
        
        /* Toolbar */
        .assignment-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        
        .toolbar-left {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          min-width: 200px;
        }
        
        .search-box svg {
          width: 18px;
          height: 18px;
          color: #9ca3af;
          flex-shrink: 0;
        }
        
        .search-box input {
          flex: 1;
          background: none;
          border: none;
          color: #1f2937;
          font-size: 14px;
          outline: none;
        }
        
        .search-box input::placeholder {
          color: #9ca3af;
        }
        
        .filter-select {
          padding: 10px 14px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          color: #1f2937;
          font-size: 14px;
          outline: none;
          cursor: pointer;
        }
        
        .filter-select option {
          background: white;
          color: #1f2937;
        }
        
        .toolbar-right {
          display: flex;
          gap: 10px;
        }
        
        .btn-add {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          color: #374151;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-add:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }
        
        .btn-add svg {
          width: 16px;
          height: 16px;
        }
        
        /* Bulk Actions */
        .bulk-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 12px;
          margin-bottom: 16px;
        }
        
        .bulk-count {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
        }
        
        .bulk-select {
          flex: 1;
          max-width: 300px;
          padding: 8px 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          color: #1f2937;
          font-size: 13px;
          outline: none;
        }
        
        .bulk-select option, .bulk-select optgroup {
          background: white;
          color: #1f2937;
        }
        
        .btn-bulk-assign {
          padding: 8px 16px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        
        .btn-bulk-assign:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-clear {
          padding: 8px 12px;
          background: none;
          border: none;
          color: #6b7280;
          font-size: 13px;
          cursor: pointer;
        }
        
        .btn-clear:hover {
          color: #1f2937;
        }
        
        /* Tasks Table */
        .tasks-table-container {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          overflow: hidden;
        }
        
        .tasks-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .tasks-table th {
          padding: 14px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .tasks-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .tasks-table tbody tr:hover {
          background: #f9fafb;
        }
        
        .col-check {
          width: 40px;
        }
        
        .col-task {
          min-width: 250px;
        }
        
        .col-type {
          width: 120px;
        }
        
        .col-priority {
          width: 100px;
        }
        
        .col-deadline {
          width: 140px;
        }
        
        .col-assignee {
          width: 200px;
        }
        
        .tasks-table input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        
        .empty-table {
          padding: 60px 40px;
          text-align: center;
          color: #6b7280;
        }
        
        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .modal-content {
          width: 100%;
          max-width: 500px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .modal-close {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        
        .modal-close:hover {
          background: #f3f4f6;
          color: #1f2937;
        }
        
        .modal-close svg {
          width: 20px;
          height: 20px;
        }
        
        .modal-body {
          padding: 24px;
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }
        
        .form-group input {
          width: 100%;
          padding: 12px 14px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          color: #1f2937;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }
        
        .form-group input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .form-group input::placeholder {
          color: #9ca3af;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
        }
        
        .btn-cancel {
          padding: 12px 20px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        
        .btn-cancel:hover {
          background: #f9fafb;
        }
        
        .btn-save {
          padding: 12px 20px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        
        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Step Actions */
        .step-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
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
        
        .btn-secondary:hover {
          background: #f9fafb;
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
        
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        }
        
        .btn-primary svg {
          width: 18px;
          height: 18px;
        }
      `}</style>
    </div>
  );
};

// Task Row Component
interface TaskRowProps {
  task: ExtractedTask;
  selected: boolean;
  onSelect: () => void;
  assignee?: Assignee;
  assignees: Assignee[];
  onAssign: (assigneeId: string, type: 'vendor' | 'external') => void;
  onUpdatePriority: (priority: 'low' | 'medium' | 'high' | 'critical') => void;
  onUpdateDeadline: (deadline: string) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  selected,
  onSelect,
  assignee,
  assignees,
  onAssign,
  onUpdatePriority,
  onUpdateDeadline,
}) => {
  const typeLabels: Record<string, string> = {
    task: '📋 Task',
    action_item: '✅ Action',
    deliverable: '📦 Deliverable',
    deadline: '⏰ Deadline',
  };

  return (
    <tr className={selected ? 'selected' : ''}>
      <td>
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
        />
      </td>
      <td>
        <div className="task-cell">
          <span className="task-title">{task.title}</span>
          {task.description && (
            <span className="task-desc">{task.description.substring(0, 80)}...</span>
          )}
        </div>
      </td>
      <td>
        <span className="type-badge">{typeLabels[task.type] || task.type}</span>
      </td>
      <td>
        <select
          value={task.priority}
          onChange={(e) => onUpdatePriority(e.target.value as any)}
          className="priority-select"
          style={{ color: getPriorityColor(task.priority) }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </td>
      <td>
        <input
          type="date"
          value={task.deadline?.split('T')[0] || ''}
          onChange={(e) => onUpdateDeadline(e.target.value)}
          className="deadline-input"
        />
      </td>
      <td>
        <select
          value={task.assignedTo ? `${task.assigneeType}:${task.assignedTo}` : ''}
          onChange={(e) => {
            if (e.target.value) {
              const [type, id] = e.target.value.split(':');
              onAssign(id, type as 'vendor' | 'external');
            }
          }}
          className="assignee-select"
        >
          <option value="">Unassigned</option>
          {assignees.map(a => (
            <option key={`${a.type}:${a.id}`} value={`${a.type}:${a.id}`}>
              {a.name} ({a.company})
            </option>
          ))}
        </select>
      </td>
      
      <style>{`
        tr.selected {
          background: rgba(102, 126, 234, 0.1);
        }
        
        .task-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .task-title {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
        }
        
        .task-desc {
          font-size: 12px;
          color: #6b7280;
        }
        
        .type-badge {
          font-size: 12px;
          color: #4b5563;
        }
        
        .priority-select,
        .deadline-input,
        .assignee-select {
          width: 100%;
          padding: 8px 10px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          color: #1f2937;
          font-size: 13px;
          outline: none;
          cursor: pointer;
        }
        
        .priority-select:focus,
        .deadline-input:focus,
        .assignee-select:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }
        
        .priority-select option,
        .assignee-select option {
          background: white;
          color: #1f2937;
        }
        
        .deadline-input::-webkit-calendar-picker-indicator {
          cursor: pointer;
        }
      `}</style>
    </tr>
  );
};

export default TaskAssignmentStep;
