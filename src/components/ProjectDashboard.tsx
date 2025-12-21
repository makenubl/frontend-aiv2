/**
 * Project Tracker Dashboard Component
 * 
 * Main dashboard for project activity tracking with:
 * - Overview statistics
 * - Project list with status
 * - Task views grouped by owner/status/project
 * - Filter controls
 * - AI insights panel
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  dashboardApi,
  projectsApi,
  tasksApi,
  vendorsApi,
  externalsApi,
  DashboardStats,
  Project,
  Task,
  Vendor,
  ExternalEmployee,
  TaskStatus,
  TaskPriority,
  OwnerType,
  TaskFilterOptions,
} from '../services/projects.api';

// =============================================================================
// TYPES
// =============================================================================

type ViewMode = 'overview' | 'projects' | 'tasks' | 'vendors' | 'externals';
type TaskGroupBy = 'owner' | 'status' | 'project' | 'priority';

interface FilterState {
  projectId?: string;
  status: TaskStatus[];
  ownerType: OwnerType[];
  priority: TaskPriority[];
  isOverdue: boolean;
  isBlocked: boolean;
  searchQuery: string;
}

// =============================================================================
// STYLED COMPONENTS (Inline styles for simplicity)
// =============================================================================

const styles = {
  container: {
    padding: '24px',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  } as React.CSSProperties,
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  } as React.CSSProperties,
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '4px',
  } as React.CSSProperties,
  navTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '12px',
  } as React.CSSProperties,
  navTab: (active: boolean) => ({
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: active ? '600' : '500',
    color: active ? '#3b82f6' : '#64748b',
    backgroundColor: active ? '#eff6ff' : 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }) as React.CSSProperties,
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  } as React.CSSProperties,
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  } as React.CSSProperties,
  statLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#64748b',
    marginBottom: '8px',
  } as React.CSSProperties,
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
  } as React.CSSProperties,
  statChange: (positive: boolean) => ({
    fontSize: '12px',
    color: positive ? '#10b981' : '#ef4444',
    marginTop: '4px',
  }) as React.CSSProperties,
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '24px',
  } as React.CSSProperties,
  mainContentFull: {
    display: 'block',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  filterBar: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  } as React.CSSProperties,
  filterSelect: {
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    minWidth: '140px',
  } as React.CSSProperties,
  filterInput: {
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    minWidth: '200px',
  } as React.CSSProperties,
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#64748b',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  } as React.CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    borderBottom: '2px solid #e2e8f0',
  } as React.CSSProperties,
  td: {
    padding: '14px 12px',
    fontSize: '14px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
  } as React.CSSProperties,
  statusBadge: (status: TaskStatus | string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'not-started': { bg: '#f1f5f9', text: '#64748b' },
      'in-progress': { bg: '#dbeafe', text: '#2563eb' },
      'blocked': { bg: '#fee2e2', text: '#dc2626' },
      'completed': { bg: '#dcfce7', text: '#16a34a' },
      'cancelled': { bg: '#f3f4f6', text: '#6b7280' },
      'active': { bg: '#dcfce7', text: '#16a34a' },
      'on-hold': { bg: '#fef3c7', text: '#d97706' },
      'archived': { bg: '#f3f4f6', text: '#6b7280' },
    };
    const color = colors[status] || colors['not-started'];
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
  priorityBadge: (priority: TaskPriority) => {
    const colors: Record<TaskPriority, { bg: string; text: string }> = {
      'low': { bg: '#f1f5f9', text: '#64748b' },
      'medium': { bg: '#fef3c7', text: '#d97706' },
      'high': { bg: '#fed7aa', text: '#ea580c' },
      'critical': { bg: '#fee2e2', text: '#dc2626' },
    };
    const color = colors[priority];
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
  ownerTypeBadge: (type: OwnerType) => {
    const colors: Record<OwnerType, { bg: string; text: string }> = {
      'internal': { bg: '#dbeafe', text: '#2563eb' },
      'external': { bg: '#e0e7ff', text: '#4f46e5' },
      'vendor': { bg: '#fae8ff', text: '#a21caf' },
    };
    const color = colors[type];
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
  aiInsightCard: {
    backgroundColor: '#fefce8',
    border: '1px solid #fef08a',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  } as React.CSSProperties,
  aiInsightTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#a16207',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  aiInsightText: {
    fontSize: '14px',
    color: '#78350f',
    lineHeight: '1.5',
  } as React.CSSProperties,
  bottleneckItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    marginBottom: '8px',
  } as React.CSSProperties,
  progressBar: {
    width: '100%',
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
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: '#64748b',
  } as React.CSSProperties,
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  buttonSecondary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  groupHeader: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginTop: '16px',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  taskRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    marginBottom: '4px',
    border: '1px solid #e2e8f0',
    transition: 'box-shadow 0.2s',
    cursor: 'pointer',
  } as React.CSSProperties,
  taskTitle: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  } as React.CSSProperties,
  taskMeta: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  } as React.CSSProperties,
  loadingOverlay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    color: '#64748b',
  } as React.CSSProperties,
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const StatCard: React.FC<{
  label: string;
  value: number | string;
  change?: string;
  positive?: boolean;
  icon?: string;
}> = ({ label, value, change, positive }) => (
  <div style={styles.statCard}>
    <div style={styles.statLabel}>{label}</div>
    <div style={styles.statValue}>{value}</div>
    {change && <div style={styles.statChange(positive ?? true)}>{change}</div>}
  </div>
);

const AIInsightPanel: React.FC<{
  title: string;
  content: string;
  type?: 'info' | 'warning' | 'success';
}> = ({ title, content }) => (
  <div style={styles.aiInsightCard}>
    <div style={styles.aiInsightTitle}>
      🤖 {title}
    </div>
    <div style={styles.aiInsightText}>{content}</div>
  </div>
);

const TaskCard: React.FC<{
  task: Task;
  showProject?: boolean;
  onClick?: () => void;
}> = ({ task, onClick }) => (
  <div style={styles.taskRow} onClick={onClick}>
    <div style={styles.taskTitle}>
      {task.title}
      {task.isAIGenerated && (
        <span style={{ marginLeft: '8px', fontSize: '11px', color: '#a855f7' }}>
          🤖 AI-extracted
        </span>
      )}
    </div>
    <div style={styles.taskMeta}>
      <span style={styles.ownerTypeBadge(task.ownerType)}>
        {task.ownerType}
      </span>
      <span style={styles.statusBadge(task.status)}>
        {task.status}
      </span>
      <span style={styles.priorityBadge(task.priority)}>
        {task.priority}
      </span>
      {task.dueDate && (
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          Due: {new Date(task.dueDate).toLocaleDateString()}
        </span>
      )}
    </div>
  </div>
);

const ProgressCell: React.FC<{ percent: number }> = ({ percent }) => (
  <div style={{ width: '100px' }}>
    <div style={styles.progressBar}>
      <div style={styles.progressFill(percent)} />
    </div>
    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', textAlign: 'center' }}>
      {percent}%
    </div>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ProjectDashboard: React.FC = () => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [taskGroupBy, setTaskGroupBy] = useState<TaskGroupBy>('owner');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [topActions, setTopActions] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [externals, setExternals] = useState<ExternalEmployee[]>([]);
  const [pendingOnWhom, setPendingOnWhom] = useState<any>(null);
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    ownerType: [],
    priority: [],
    isOverdue: false,
    isBlocked: false,
    searchQuery: '',
  });

  // Selected items
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Modal states
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    status: 'active' as 'active' | 'on-hold' | 'completed' | 'archived',
  });

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Load data when view changes
  useEffect(() => {
    if (viewMode === 'projects' && projects.length === 0) {
      loadProjects();
    } else if (viewMode === 'tasks' && tasks.length === 0) {
      loadTasks();
    } else if (viewMode === 'vendors' && vendors.length === 0) {
      loadVendors();
    } else if (viewMode === 'externals' && externals.length === 0) {
      loadExternals();
    }
  }, [viewMode]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, summaryRes, pendingRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getSummary(),
        dashboardApi.getPendingOnWhom(),
      ]);
      
      setStats(statsRes.data.stats);
      setAiInsights(summaryRes.data.aiInsights);
      setTopActions(summaryRes.data.topActions || []);
      setPendingOnWhom(pendingRes.data);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await projectsApi.list();
      setProjects(res.data.projects);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadTasks = useCallback(async () => {
    try {
      const filterOptions: TaskFilterOptions = {};
      if (filters.projectId) filterOptions.projectId = filters.projectId;
      if (filters.status.length) filterOptions.status = filters.status;
      if (filters.ownerType.length) filterOptions.ownerType = filters.ownerType;
      if (filters.priority.length) filterOptions.priority = filters.priority;
      if (filters.isOverdue) filterOptions.isOverdue = true;
      if (filters.isBlocked) filterOptions.isBlocked = true;
      if (filters.searchQuery) filterOptions.searchQuery = filters.searchQuery;
      
      const res = await tasksApi.filter(filterOptions);
      setTasks(res.data.tasks);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
    }
  }, [filters]);

  const loadVendors = async () => {
    try {
      const res = await vendorsApi.list();
      setVendors(res.data.vendors);
    } catch (err: any) {
      console.error('Failed to load vendors:', err);
    }
  };

  const loadExternals = async () => {
    try {
      const res = await externalsApi.list();
      setExternals(res.data.externals);
    } catch (err: any) {
      console.error('Failed to load external employees:', err);
    }
  };

  // Create a new project
  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      setError('Project name is required');
      return;
    }
    
    try {
      await projectsApi.create({
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        priority: newProject.priority,
        status: newProject.status,
      });
      
      // Reset form and close modal
      setNewProject({
        name: '',
        description: '',
        priority: 'medium',
        status: 'active',
      });
      setShowCreateProjectModal(false);
      
      // Reload projects
      await loadProjects();
      
      // Also refresh dashboard stats
      loadDashboardData();
    } catch (err: any) {
      console.error('Failed to create project:', err);
      setError(err.response?.data?.error || 'Failed to create project');
    }
  };

  // Apply filters
  useEffect(() => {
    if (viewMode === 'tasks') {
      loadTasks();
    }
  }, [filters, viewMode, loadTasks]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    
    tasks.forEach((task) => {
      let key: string;
      switch (taskGroupBy) {
        case 'owner':
          key = `${task.ownerType}: ${task.ownerName || 'Unassigned'}`;
          break;
        case 'status':
          key = task.status;
          break;
        case 'project':
          key = task.projectId;
          break;
        case 'priority':
          key = task.priority;
          break;
        default:
          key = 'all';
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    
    return groups;
  }, [tasks, taskGroupBy]);

  // Render functions
  const renderOverview = () => (
    <>
      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <StatCard label="Total Projects" value={stats?.totalProjects || 0} />
        <StatCard label="Active Projects" value={stats?.activeProjects || 0} />
        <StatCard label="Total Tasks" value={stats?.totalTasks || 0} />
        <StatCard 
          label="Overdue Tasks" 
          value={stats?.overdueTasks || 0}
          change={stats?.overdueTasks ? 'Needs attention' : ''}
          positive={!stats?.overdueTasks}
        />
        <StatCard 
          label="Blocked Tasks" 
          value={stats?.blockedTasks || 0}
          change={stats?.blockedTasks ? 'Review blockers' : ''}
          positive={!stats?.blockedTasks}
        />
        <StatCard 
          label="Completed This Week" 
          value={stats?.tasksCompletedThisWeek || 0}
          change={`${stats?.avgCompletionRate?.toFixed(0) || 0}% avg completion`}
          positive
        />
      </div>

      <div style={styles.mainContent}>
        {/* Left Column - Tasks & Projects */}
        <div>
          {/* AI Insights */}
          {aiInsights && (
            <AIInsightPanel
              title="AI Analysis"
              content={aiInsights}
            />
          )}

          {/* Top Actions */}
          {topActions.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>
                <span>🎯 Recommended Actions</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {topActions.map((action, i) => (
                  <li key={i} style={{ marginBottom: '8px', color: '#334155' }}>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tasks by Status */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <span>📊 Tasks by Status</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {['not-started', 'in-progress', 'blocked', 'completed', 'cancelled'].map((status) => (
                <div key={status} style={{ textAlign: 'center', padding: '12px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                    {stats?.tasksByStatus[status as TaskStatus] || 0}
                  </div>
                  <div style={styles.statusBadge(status)}>
                    {status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks by Owner Type */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <span>👥 Tasks by Owner Type</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {(['internal', 'external', 'vendor'] as OwnerType[]).map((type) => (
                <div key={type} style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
                    {stats?.tasksByOwnerType[type] || 0}
                  </div>
                  <div style={styles.ownerTypeBadge(type)}>
                    {type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Pending & Bottlenecks */}
        <div>
          {/* Pending On Whom */}
          {pendingOnWhom && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>
                <span>⏳ Pending On Whom</span>
              </div>
              <div style={{ marginBottom: '16px', fontSize: '14px', color: '#475569' }}>
                {pendingOnWhom.summary}
              </div>
              {pendingOnWhom.topBlockers?.map((blocker: any, i: number) => (
                <div key={i} style={styles.bottleneckItem}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{blocker.owner}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {blocker.taskCount} tasks pending
                    </div>
                  </div>
                  <span style={styles.ownerTypeBadge(blocker.type)}>
                    {blocker.type}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Top Bottlenecks */}
          {stats?.topBottlenecks && stats.topBottlenecks.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>
                <span>🚧 Top Bottlenecks</span>
              </div>
              {stats.topBottlenecks.map((bottleneck, i) => (
                <div key={i} style={styles.bottleneckItem}>
                  <div>
                    <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '13px' }}>
                      {bottleneck.taskTitle}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {bottleneck.projectName} • {bottleneck.owner}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626' }}>
                    {bottleneck.daysPending}d
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Risk Areas */}
          {pendingOnWhom?.riskAreas && pendingOnWhom.riskAreas.length > 0 && (
            <div style={{ ...styles.card, backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
              <div style={styles.cardTitle}>
                <span>⚠️ Risk Areas</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {pendingOnWhom.riskAreas.map((risk: string, i: number) => (
                  <li key={i} style={{ marginBottom: '8px', fontSize: '13px', color: '#991b1b' }}>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderProjects = () => (
    <div style={styles.mainContentFull}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, color: '#1e293b' }}>All Projects</h3>
        <button style={styles.button} onClick={() => setShowCreateProjectModal(true)}>
          + New Project
        </button>
      </div>
      
      {projects.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No projects yet</div>
          <div>Create your first project to start tracking activities</div>
        </div>
      ) : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Project Name</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Priority</th>
                <th style={styles.th}>Owner</th>
                <th style={styles.th}>Tasks</th>
                <th style={styles.th}>Progress</th>
                <th style={styles.th}>Target Date</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr 
                  key={project.projectId}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedProject(project)}
                >
                  <td style={styles.td}>
                    <div style={{ fontWeight: '600' }}>{project.name}</div>
                    {project.description && (
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {project.description.substring(0, 60)}...
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.statusBadge(project.status)}>
                      {project.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.priorityBadge(project.priority)}>
                      {project.priority}
                    </span>
                  </td>
                  <td style={styles.td}>{project.ownerName}</td>
                  <td style={styles.td}>{project.taskSummary?.total || 0}</td>
                  <td style={styles.td}>
                    {project.taskSummary && (
                      <ProgressCell 
                        percent={project.taskSummary.total > 0 
                          ? Math.round((project.taskSummary.completed / project.taskSummary.total) * 100)
                          : 0
                        }
                      />
                    )}
                  </td>
                  <td style={styles.td}>
                    {project.targetEndDate 
                      ? new Date(project.targetEndDate).toLocaleDateString()
                      : '-'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderTasks = () => (
    <div style={styles.mainContentFull}>
      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Search tasks..."
          style={styles.filterInput}
          value={filters.searchQuery}
          onChange={(e) => setFilters(f => ({ ...f, searchQuery: e.target.value }))}
        />
        
        <select
          style={styles.filterSelect}
          value={filters.projectId || ''}
          onChange={(e) => setFilters(f => ({ ...f, projectId: e.target.value || undefined }))}
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.projectId} value={p.projectId}>{p.name}</option>
          ))}
        </select>
        
        <select
          style={styles.filterSelect}
          multiple
          value={filters.status}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions).map(o => o.value as TaskStatus);
            setFilters(f => ({ ...f, status: selected }));
          }}
        >
          <option value="not-started">Not Started</option>
          <option value="in-progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        
        <select
          style={styles.filterSelect}
          multiple
          value={filters.ownerType}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions).map(o => o.value as OwnerType);
            setFilters(f => ({ ...f, ownerType: selected }));
          }}
        >
          <option value="internal">Internal</option>
          <option value="external">External</option>
          <option value="vendor">Vendor</option>
        </select>
        
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={filters.isOverdue}
            onChange={(e) => setFilters(f => ({ ...f, isOverdue: e.target.checked }))}
          />
          Overdue only
        </label>
        
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={filters.isBlocked}
            onChange={(e) => setFilters(f => ({ ...f, isBlocked: e.target.checked }))}
          />
          Blocked only
        </label>
        
        <select
          style={styles.filterSelect}
          value={taskGroupBy}
          onChange={(e) => setTaskGroupBy(e.target.value as TaskGroupBy)}
        >
          <option value="owner">Group by Owner</option>
          <option value="status">Group by Status</option>
          <option value="project">Group by Project</option>
          <option value="priority">Group by Priority</option>
        </select>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No tasks found</div>
          <div>Adjust your filters or create a new task</div>
        </div>
      ) : (
        <div style={styles.card}>
          {Object.entries(groupedTasks).map(([group, groupTasks]) => (
            <div key={group}>
              <div style={styles.groupHeader}>
                <span>{group}</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {groupTasks.length} tasks
                </span>
              </div>
              {groupTasks.map((task) => (
                <TaskCard
                  key={task.taskId}
                  task={task}
                  onClick={() => setSelectedTask(task)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderVendors = () => (
    <div style={styles.mainContentFull}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, color: '#1e293b' }}>Vendors</h3>
        <button style={styles.button} onClick={() => {/* TODO: Open create modal */}}>
          + Add Vendor
        </button>
      </div>
      
      {vendors.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No vendors yet</div>
          <div>Add vendors to assign tasks to external parties</div>
        </div>
      ) : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Vendor Name</th>
                <th style={styles.th}>Contact</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Portal</th>
                <th style={styles.th}>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.vendorId}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: '600' }}>{vendor.name}</div>
                  </td>
                  <td style={styles.td}>{vendor.contactName}</td>
                  <td style={styles.td}>{vendor.contactEmail}</td>
                  <td style={styles.td}>{vendor.category || '-'}</td>
                  <td style={styles.td}>
                    <span style={styles.statusBadge(vendor.status)}>
                      {vendor.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {vendor.portalEnabled ? '✅ Enabled' : '❌ Disabled'}
                  </td>
                  <td style={styles.td}>
                    {vendor.lastPortalLogin 
                      ? new Date(vendor.lastPortalLogin).toLocaleString()
                      : 'Never'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderExternals = () => (
    <div style={styles.mainContentFull}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, color: '#1e293b' }}>External Employees</h3>
        <button style={styles.button} onClick={() => {/* TODO: Open create modal */}}>
          + Add External
        </button>
      </div>
      
      {externals.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No external employees yet</div>
          <div>Add external team members to collaborate on projects</div>
        </div>
      ) : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Organization</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Portal</th>
              </tr>
            </thead>
            <tbody>
              {externals.map((external) => (
                <tr key={external.externalId}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: '600' }}>{external.name}</div>
                  </td>
                  <td style={styles.td}>{external.email}</td>
                  <td style={styles.td}>{external.organization || '-'}</td>
                  <td style={styles.td}>{external.role || '-'}</td>
                  <td style={styles.td}>
                    <span style={styles.statusBadge(external.status)}>
                      {external.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {external.portalEnabled ? '✅ Enabled' : '❌ Disabled'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Main render
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingOverlay}>
          <div>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.emptyState, color: '#dc2626' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Error Loading Dashboard</div>
          <div>{error}</div>
          <button 
            style={{ ...styles.button, marginTop: '16px' }}
            onClick={loadDashboardData}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Project Activity Tracker</h1>
          <div style={styles.subtitle}>
            Track projects, tasks, and vendor activities in real-time
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={styles.buttonSecondary} onClick={loadDashboardData}>
            🔄 Refresh
          </button>
          <button style={styles.button} onClick={() => setShowCreateProjectModal(true)}>
            + New Project
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.navTabs}>
        <button 
          style={styles.navTab(viewMode === 'overview')} 
          onClick={() => setViewMode('overview')}
        >
          📊 Overview
        </button>
        <button 
          style={styles.navTab(viewMode === 'projects')} 
          onClick={() => setViewMode('projects')}
        >
          📁 Projects
        </button>
        <button 
          style={styles.navTab(viewMode === 'tasks')} 
          onClick={() => setViewMode('tasks')}
        >
          📋 Tasks
        </button>
        <button 
          style={styles.navTab(viewMode === 'vendors')} 
          onClick={() => setViewMode('vendors')}
        >
          🏢 Vendors
        </button>
        <button 
          style={styles.navTab(viewMode === 'externals')} 
          onClick={() => setViewMode('externals')}
        >
          👤 External Employees
        </button>
      </div>

      {/* Content */}
      {viewMode === 'overview' && renderOverview()}
      {viewMode === 'projects' && renderProjects()}
      {viewMode === 'tasks' && renderTasks()}
      {viewMode === 'vendors' && renderVendors()}
      {viewMode === 'externals' && renderExternals()}

      {/* Task Detail Modal (placeholder) */}
      {selectedTask && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedTask(null)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px 0' }}>{selectedTask.title}</h2>
            <p style={{ color: '#64748b' }}>{selectedTask.description || 'No description'}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <div style={styles.statLabel}>Status</div>
                <span style={styles.statusBadge(selectedTask.status)}>{selectedTask.status}</span>
              </div>
              <div>
                <div style={styles.statLabel}>Priority</div>
                <span style={styles.priorityBadge(selectedTask.priority)}>{selectedTask.priority}</span>
              </div>
              <div>
                <div style={styles.statLabel}>Owner Type</div>
                <span style={styles.ownerTypeBadge(selectedTask.ownerType)}>{selectedTask.ownerType}</span>
              </div>
              <div>
                <div style={styles.statLabel}>Owner</div>
                <span>{selectedTask.ownerName || 'Unassigned'}</span>
              </div>
              <div>
                <div style={styles.statLabel}>Progress</div>
                <ProgressCell percent={selectedTask.percentComplete} />
              </div>
              <div>
                <div style={styles.statLabel}>Due Date</div>
                <span>{selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'Not set'}</span>
              </div>
            </div>

            {selectedTask.isAIGenerated && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f3ff', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#7c3aed' }}>
                  🤖 AI-Generated Task
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Confidence: {((selectedTask.aiConfidence || 0) * 100).toFixed(0)}%
                  {selectedTask.sourceInfo?.fileName && (
                    <span> • Source: {selectedTask.sourceInfo.fileName}</span>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button style={styles.buttonSecondary} onClick={() => setSelectedTask(null)}>
                Close
              </button>
              <button style={styles.button}>
                Edit Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Modal (placeholder) */}
      {selectedProject && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedProject(null)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 8px 0' }}>{selectedProject.name}</h2>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>
              {selectedProject.description || 'No description'}
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <div style={styles.statLabel}>Status</div>
                <span style={styles.statusBadge(selectedProject.status)}>{selectedProject.status}</span>
              </div>
              <div>
                <div style={styles.statLabel}>Priority</div>
                <span style={styles.priorityBadge(selectedProject.priority)}>{selectedProject.priority}</span>
              </div>
              <div>
                <div style={styles.statLabel}>Owner</div>
                <span>{selectedProject.ownerName}</span>
              </div>
            </div>

            {selectedProject.taskSummary && (
              <div style={{ marginTop: '24px' }}>
                <div style={styles.statLabel}>Task Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '8px' }}>
                  <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>{selectedProject.taskSummary.total}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Total</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>{selectedProject.taskSummary.completed}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Completed</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#2563eb' }}>{selectedProject.taskSummary.inProgress}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>In Progress</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>{selectedProject.taskSummary.blocked}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Blocked</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#64748b' }}>{selectedProject.taskSummary.notStarted}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Not Started</div>
                  </div>
                </div>
              </div>
            )}

            {selectedProject.aiSummary && (
              <div style={{ marginTop: '24px' }}>
                <AIInsightPanel
                  title="AI Project Summary"
                  content={selectedProject.aiSummary.overallStatus}
                />
                {selectedProject.aiSummary.recommendations.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={styles.statLabel}>Recommendations</div>
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                      {selectedProject.aiSummary.recommendations.map((rec, i) => (
                        <li key={i} style={{ marginBottom: '4px', fontSize: '13px', color: '#475569' }}>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button style={styles.buttonSecondary} onClick={() => setSelectedProject(null)}>
                Close
              </button>
              <button 
                style={styles.button}
                onClick={() => {
                  setViewMode('tasks');
                  setFilters(f => ({ ...f, projectId: selectedProject.projectId }));
                  setSelectedProject(null);
                }}
              >
                View Tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateProjectModal(false);
          }}
        >
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '24px',
            width: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
              Create New Project
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Enter project name"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Enter project description"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
                    Priority
                  </label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject({ ...newProject, priority: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      backgroundColor: '#fff',
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
                    Status
                  </label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      backgroundColor: '#fff',
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                style={styles.buttonSecondary} 
                onClick={() => {
                  setShowCreateProjectModal(false);
                  setNewProject({ name: '', description: '', priority: 'medium', status: 'active' });
                }}
              >
                Cancel
              </button>
              <button 
                style={{
                  ...styles.button,
                  opacity: newProject.name.trim() ? 1 : 0.5,
                  cursor: newProject.name.trim() ? 'pointer' : 'not-allowed',
                }}
                onClick={handleCreateProject}
                disabled={!newProject.name.trim()}
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDashboard;
