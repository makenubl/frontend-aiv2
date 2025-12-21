/**
 * Vendor Portal Component
 * 
 * Standalone portal for vendors and external employees to:
 * - Login with limited credentials
 * - View assigned tasks
 * - Update task status and progress
 * - Add comments
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  vendorPortalApi,
  setPortalToken,
  Task,
  TaskStatus,
} from '../services/projects.api';

// =============================================================================
// TYPES
// =============================================================================

interface PortalUser {
  type: 'vendor' | 'external';
  id: string;
  name: string;
  email: string;
}

interface TaskWithProject extends Task {
  projectName: string;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  // Layout
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
  } as React.CSSProperties,
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  } as React.CSSProperties,
  loginCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,
  loginTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center' as const,
    marginBottom: '8px',
  } as React.CSSProperties,
  loginSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center' as const,
    marginBottom: '32px',
  } as React.CSSProperties,
  inputGroup: {
    marginBottom: '20px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  loginButton: {
    width: '100%',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: '8px',
  } as React.CSSProperties,
  errorMessage: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  
  // Header
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  headerTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
  } as React.CSSProperties,
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  } as React.CSSProperties,
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#334155',
  } as React.CSSProperties,
  userBadge: {
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '20px',
    backgroundColor: '#e0e7ff',
    color: '#4f46e5',
    fontWeight: '600',
  } as React.CSSProperties,
  logoutButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  } as React.CSSProperties,

  // Content
  content: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  } as React.CSSProperties,
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  } as React.CSSProperties,
  welcomeTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px',
  } as React.CSSProperties,
  welcomeText: {
    fontSize: '14px',
    color: '#64748b',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,

  // Task List
  taskGrid: {
    display: 'grid',
    gap: '12px',
  } as React.CSSProperties,
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, border-color 0.2s',
  } as React.CSSProperties,
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  } as React.CSSProperties,
  taskTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px',
  } as React.CSSProperties,
  taskProject: {
    fontSize: '12px',
    color: '#64748b',
  } as React.CSSProperties,
  taskDescription: {
    fontSize: '13px',
    color: '#475569',
    lineHeight: '1.5',
    marginBottom: '12px',
  } as React.CSSProperties,
  taskMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
  } as React.CSSProperties,
  statusBadge: (status: TaskStatus) => {
    const colors: Record<TaskStatus, { bg: string; text: string }> = {
      'not-started': { bg: '#f1f5f9', text: '#64748b' },
      'in-progress': { bg: '#dbeafe', text: '#2563eb' },
      'blocked': { bg: '#fee2e2', text: '#dc2626' },
      'completed': { bg: '#dcfce7', text: '#16a34a' },
      'cancelled': { bg: '#f3f4f6', text: '#6b7280' },
    };
    const color = colors[status];
    return {
      display: 'inline-block',
      padding: '4px 10px',
      fontSize: '12px',
      fontWeight: '600',
      borderRadius: '20px',
      backgroundColor: color.bg,
      color: color.text,
    } as React.CSSProperties;
  },
  priorityBadge: (priority: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'low': { bg: '#f1f5f9', text: '#64748b' },
      'medium': { bg: '#fef3c7', text: '#d97706' },
      'high': { bg: '#fed7aa', text: '#ea580c' },
      'critical': { bg: '#fee2e2', text: '#dc2626' },
    };
    const color = colors[priority] || colors['medium'];
    return {
      display: 'inline-block',
      padding: '4px 10px',
      fontSize: '12px',
      fontWeight: '600',
      borderRadius: '20px',
      backgroundColor: color.bg,
      color: color.text,
    } as React.CSSProperties;
  },
  dueDateBadge: (isOverdue: boolean) => ({
    fontSize: '12px',
    color: isOverdue ? '#dc2626' : '#64748b',
    fontWeight: isOverdue ? '600' : '400',
  }) as React.CSSProperties,
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  progressBar: {
    width: '100px',
    height: '6px',
    backgroundColor: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
  } as React.CSSProperties,
  progressFill: (percent: number) => ({
    width: `${percent}%`,
    height: '100%',
    backgroundColor: percent >= 100 ? '#10b981' : percent >= 50 ? '#3b82f6' : '#f59e0b',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  }) as React.CSSProperties,
  progressText: {
    fontSize: '12px',
    color: '#64748b',
    minWidth: '36px',
  } as React.CSSProperties,

  // Task Detail Modal
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  } as React.CSSProperties,
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  } as React.CSSProperties,
  modalBody: {
    padding: '24px',
  } as React.CSSProperties,
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  } as React.CSSProperties,
  closeButton: {
    padding: '8px',
    fontSize: '20px',
    color: '#64748b',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    lineHeight: 1,
  } as React.CSSProperties,
  formGroup: {
    marginBottom: '20px',
  } as React.CSSProperties,
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    outline: 'none',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    outline: 'none',
    minHeight: '100px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  slider: {
    width: '100%',
    marginTop: '8px',
  } as React.CSSProperties,
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  } as React.CSSProperties,
  buttonPrimary: {
    color: '#ffffff',
    backgroundColor: '#3b82f6',
  } as React.CSSProperties,
  buttonSecondary: {
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
  } as React.CSSProperties,

  // Comments
  commentsSection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  } as React.CSSProperties,
  commentsList: {
    maxHeight: '200px',
    overflowY: 'auto' as const,
    marginBottom: '16px',
  } as React.CSSProperties,
  commentItem: {
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '8px',
  } as React.CSSProperties,
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  } as React.CSSProperties,
  commentAuthor: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
  } as React.CSSProperties,
  commentDate: {
    fontSize: '11px',
    color: '#94a3b8',
  } as React.CSSProperties,
  commentText: {
    fontSize: '13px',
    color: '#475569',
    lineHeight: '1.5',
  } as React.CSSProperties,

  // Loading & Empty
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    color: '#64748b',
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: '#64748b',
  } as React.CSSProperties,
};

// =============================================================================
// LOGIN COMPONENT
// =============================================================================

const LoginForm: React.FC<{
  onLogin: (user: PortalUser, token: string) => void;
}> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await vendorPortalApi.login(email, password);
      setPortalToken(response.data.token);
      onLogin(response.data.user, response.data.token);
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
          <h1 style={styles.loginTitle}>Vendor Portal</h1>
          <p style={styles.loginSubtitle}>
            Sign in to view and update your assigned tasks
          </p>
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.loginButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'wait' : 'pointer',
            }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
          Contact your project administrator if you need access.
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// TASK DETAIL MODAL
// =============================================================================

const TaskDetailModal: React.FC<{
  task: TaskWithProject;
  onClose: () => void;
  onUpdate: (task: TaskWithProject) => void;
}> = ({ task, onClose, onUpdate }) => {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [percentComplete, setPercentComplete] = useState(task.percentComplete);
  const [comment, setComment] = useState('');
  const [blockerReason, setBlockerReason] = useState(task.blockerReason || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const updateData: any = {};
      if (status !== task.status) updateData.status = status;
      if (percentComplete !== task.percentComplete) updateData.percentComplete = percentComplete;
      if (status === 'blocked' && blockerReason) updateData.blockerReason = blockerReason;
      if (comment.trim()) updateData.comment = comment.trim();

      const response = await vendorPortalApi.updateTask(task.taskId, updateData);
      onUpdate({ ...response.data.task, projectName: task.projectName });
      onClose();
    } catch (err: any) {
      console.error('Failed to update task:', err);
      setError(err.response?.data?.error || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    setSaving(true);
    setError(null);

    try {
      const response = await vendorPortalApi.addComment(task.taskId, comment.trim());
      onUpdate({ ...response.data.task, projectName: task.projectName });
      setComment('');
    } catch (err: any) {
      console.error('Failed to add comment:', err);
      setError(err.response?.data?.error || 'Failed to add comment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
              {task.title}
            </h2>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              📁 {task.projectName}
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div style={styles.modalBody}>
          {error && (
            <div style={{ ...styles.errorMessage, marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {/* Task Info */}
          {task.description && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                {task.description}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={styles.label}>Priority</label>
              <span style={styles.priorityBadge(task.priority)}>{task.priority}</span>
            </div>
            <div>
              <label style={styles.label}>Due Date</label>
              <span style={styles.dueDateBadge(isOverdue || false)}>
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}
                {isOverdue && ' (OVERDUE)'}
              </span>
            </div>
          </div>

          {/* Status Update */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Status</label>
            <select
              style={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Blocker Reason */}
          {status === 'blocked' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Blocker Reason</label>
              <textarea
                style={styles.textarea}
                value={blockerReason}
                onChange={(e) => setBlockerReason(e.target.value)}
                placeholder="Describe what is blocking this task..."
              />
            </div>
          )}

          {/* Progress */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Progress: {percentComplete}%</label>
            <input
              type="range"
              style={styles.slider}
              min="0"
              max="100"
              step="5"
              value={percentComplete}
              onChange={(e) => setPercentComplete(parseInt(e.target.value))}
            />
            <div style={styles.progressBar}>
              <div style={styles.progressFill(percentComplete)} />
            </div>
          </div>

          {/* Comments Section */}
          <div style={styles.commentsSection}>
            <label style={styles.label}>Comments ({task.comments?.length || 0})</label>
            
            {task.comments && task.comments.length > 0 && (
              <div style={styles.commentsList}>
                {task.comments.map((comment) => (
                  <div key={comment.id} style={styles.commentItem}>
                    <div style={styles.commentHeader}>
                      <span style={styles.commentAuthor}>{comment.authorName}</span>
                      <span style={styles.commentDate}>
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div style={styles.commentText}>{comment.content}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.formGroup}>
              <textarea
                style={{ ...styles.textarea, minHeight: '80px' }}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment or update note..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.modalFooter}>
          <button
            style={{ ...styles.button, ...styles.buttonSecondary }}
            onClick={onClose}
          >
            Cancel
          </button>
          {comment.trim() && (
            <button
              style={{ ...styles.button, ...styles.buttonSecondary }}
              onClick={handleAddComment}
              disabled={saving}
            >
              Add Comment Only
            </button>
          )}
          <button
            style={{ 
              ...styles.button, 
              ...styles.buttonPrimary,
              opacity: saving ? 0.7 : 1,
            }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN PORTAL COMPONENT
// =============================================================================

const VendorPortal: React.FC = () => {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null);

  // Check for stored session on mount
  useEffect(() => {
    const storedToken = sessionStorage.getItem('vendor-portal-token');
    const storedUser = sessionStorage.getItem('vendor-portal-user');
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setPortalToken(storedToken);
      } catch {
        sessionStorage.removeItem('vendor-portal-token');
        sessionStorage.removeItem('vendor-portal-user');
      }
    }
  }, []);

  // Load tasks when logged in
  useEffect(() => {
    if (user && token) {
      loadTasks();
    }
  }, [user, token]);

  const handleLogin = (loggedInUser: PortalUser, authToken: string) => {
    setUser(loggedInUser);
    setToken(authToken);
    sessionStorage.setItem('vendor-portal-token', authToken);
    sessionStorage.setItem('vendor-portal-user', JSON.stringify(loggedInUser));
  };

  const handleLogout = async () => {
    try {
      await vendorPortalApi.logout();
    } catch {
      // Ignore logout errors
    }
    
    setUser(null);
    setToken(null);
    setTasks([]);
    setPortalToken(null);
    sessionStorage.removeItem('vendor-portal-token');
    sessionStorage.removeItem('vendor-portal-user');
  };

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await vendorPortalApi.getTasks();
      setTasks(response.data.tasks);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTaskUpdate = (updatedTask: TaskWithProject) => {
    setTasks((prev) =>
      prev.map((t) => (t.taskId === updatedTask.taskId ? updatedTask : t))
    );
    setSelectedTask(null);
  };

  // Show login if not authenticated
  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Group tasks by status
  const tasksByStatus = tasks.reduce((acc, task) => {
    const status = task.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {} as Record<TaskStatus, TaskWithProject[]>);

  const statusOrder: TaskStatus[] = ['in-progress', 'blocked', 'not-started', 'completed'];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerTitle}>🏢 Vendor Portal</div>
        <div style={styles.userInfo}>
          <div>
            <div style={styles.userName}>{user.name}</div>
            <span style={styles.userBadge}>
              {user.type === 'vendor' ? 'Vendor' : 'External'}
            </span>
          </div>
          <button style={styles.logoutButton} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={styles.content}>
        {/* Welcome Card */}
        <div style={styles.welcomeCard}>
          <div style={styles.welcomeTitle}>Welcome, {user.name}!</div>
          <div style={styles.welcomeText}>
            You have {tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you.
            Click on a task to update its status or add comments.
          </div>
        </div>

        {/* Task Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '12px', 
          marginBottom: '24px' 
        }}>
          {statusOrder.map((status) => (
            <div
              key={status}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                {tasksByStatus[status]?.length || 0}
              </div>
              <div style={styles.statusBadge(status)}>{status}</div>
            </div>
          ))}
        </div>

        {/* Tasks by Status */}
        {loading ? (
          <div style={styles.loading}>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              No Tasks Assigned
            </div>
            <div>You don't have any tasks assigned yet.</div>
          </div>
        ) : (
          statusOrder.map((status) => {
            const statusTasks = tasksByStatus[status];
            if (!statusTasks || statusTasks.length === 0) return null;

            return (
              <div key={status} style={{ marginBottom: '24px' }}>
                <div style={styles.sectionTitle}>
                  <span style={styles.statusBadge(status)}>{status}</span>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    ({statusTasks.length})
                  </span>
                </div>
                <div style={styles.taskGrid}>
                  {statusTasks.map((task) => {
                    const isOverdue = task.dueDate && 
                      new Date(task.dueDate) < new Date() && 
                      task.status !== 'completed';

                    return (
                      <div
                        key={task.taskId}
                        style={styles.taskCard}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div style={styles.taskHeader}>
                          <div>
                            <div style={styles.taskTitle}>{task.title}</div>
                            <div style={styles.taskProject}>📁 {task.projectName}</div>
                          </div>
                          <span style={styles.priorityBadge(task.priority)}>
                            {task.priority}
                          </span>
                        </div>
                        {task.description && (
                          <div style={styles.taskDescription}>
                            {task.description.length > 100
                              ? task.description.substring(0, 100) + '...'
                              : task.description}
                          </div>
                        )}
                        <div style={styles.taskMeta}>
                          <div style={styles.progressContainer}>
                            <div style={styles.progressBar}>
                              <div style={styles.progressFill(task.percentComplete)} />
                            </div>
                            <span style={styles.progressText}>{task.percentComplete}%</span>
                          </div>
                          {task.dueDate && (
                            <span style={styles.dueDateBadge(isOverdue || false)}>
                              📅 {new Date(task.dueDate).toLocaleDateString()}
                              {isOverdue && ' ⚠️'}
                            </span>
                          )}
                        </div>
                        {task.blockerReason && task.status === 'blocked' && (
                          <div style={{
                            marginTop: '12px',
                            padding: '8px 12px',
                            backgroundColor: '#fef2f2',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#dc2626',
                          }}>
                            🚧 {task.blockerReason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
};

export default VendorPortal;
