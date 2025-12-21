/**
 * Project Tracker API Service
 * 
 * Frontend API client for the Project Activity Tracking system.
 * Follows existing API patterns from api.ts
 */

import axios, { AxiosInstance } from 'axios';

// Use same base URL as main API
const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api'
);

// Helper to get auth headers from main app
const getAuthHeaders = () => {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return {
        'x-user-role': parsed.state?.user?.role || 'reviewer',
        'x-user-email': parsed.state?.user?.email || '',
      };
    }
  } catch {
    // Ignore parse errors
  }
  return {
    'x-user-role': 'reviewer',
    'x-user-email': '',
  };
};

// Create axios instance for project tracker
const projectsClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/projects`,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.REACT_APP_API_KEY || 'dev-key-12345',
  },
});

// Add request interceptor for auth headers
projectsClient.interceptors.request.use((config) => {
  const headers = getAuthHeaders();
  config.headers['x-user-role'] = headers['x-user-role'];
  config.headers['x-user-email'] = headers['x-user-email'];
  return config;
});

// File upload client
const uploadClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/projects`,
  headers: {
    'x-api-key': process.env.REACT_APP_API_KEY || 'dev-key-12345',
  },
});

uploadClient.interceptors.request.use((config) => {
  const headers = getAuthHeaders();
  config.headers['x-user-role'] = headers['x-user-role'];
  config.headers['x-user-email'] = headers['x-user-email'];
  return config;
});

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type TaskStatus = 'not-started' | 'in-progress' | 'blocked' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type OwnerType = 'internal' | 'external' | 'vendor';
export type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'archived';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Project {
  projectId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: TaskPriority;
  ownerId: string;
  ownerName: string;
  startDate?: string;
  targetEndDate?: string;
  actualEndDate?: string;
  linkedFolders?: string[];
  tags?: string[];
  taskSummary?: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
    notStarted: number;
  };
  aiSummary?: ProjectAISummary;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAISummary {
  generatedAt: string;
  overallStatus: string;
  pendingItems: string;
  bottlenecks: string;
  riskAssessment: string;
  recommendations: string[];
  riskLevel: RiskLevel;
  estimatedDelayDays?: number;
  topBlockers: Array<{
    taskId: string;
    taskTitle: string;
    blockedDays: number;
    owner: string;
    ownerType: OwnerType;
  }>;
  pendingOnVendors: number;
  pendingOnInternal: number;
  pendingOnExternal: number;
}

export interface Task {
  taskId: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  percentComplete: number;
  ownerType: OwnerType;
  ownerId: string;
  ownerName: string;
  dueDate?: string;
  startDate?: string;
  completedDate?: string;
  dependsOn?: string[];
  blockedBy?: string[];
  blockerReason?: string;
  sourceInfo?: {
    sourceType: string;
    fileName?: string;
    confidence?: number;
  };
  comments?: TaskComment[];
  createdAt: string;
  updatedAt: string;
  isAIGenerated: boolean;
  aiConfidence?: number;
}

export interface TaskComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorType: OwnerType;
  createdAt: string;
  isSystemGenerated?: boolean;
}

export interface Vendor {
  vendorId: string;
  name: string;
  contactName: string;
  contactEmail: string;
  phone?: string;
  address?: string;
  category?: string;
  status: 'active' | 'inactive' | 'suspended';
  portalEnabled: boolean;
  lastPortalLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalEmployee {
  externalId: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  vendorId?: string;
  role?: string;
  status: 'active' | 'inactive';
  portalEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByOwnerType: Record<OwnerType, number>;
  overdueTasks: number;
  blockedTasks: number;
  tasksCompletedThisWeek: number;
  avgCompletionRate: number;
  topBottlenecks: Array<{
    taskId: string;
    taskTitle: string;
    projectName: string;
    owner: string;
    daysPending: number;
  }>;
}

export interface TaskFilterOptions {
  projectId?: string;
  status?: TaskStatus[];
  ownerType?: OwnerType[];
  ownerId?: string;
  priority?: TaskPriority[];
  dueDateFrom?: string;
  dueDateTo?: string;
  isOverdue?: boolean;
  isBlocked?: boolean;
  searchQuery?: string;
}

export interface AIExtractionResult {
  success: boolean;
  tasks: Array<{
    title: string;
    description?: string;
    dueDate?: string;
    inferredOwner?: string;
    inferredOwnerType?: OwnerType;
    priority?: TaskPriority;
    confidence: number;
    sourceText: string;
    reasoning: string;
  }>;
  metadata: {
    documentType: string;
    processingTimeMs: number;
  };
}

// =============================================================================
// DASHBOARD API
// =============================================================================

export const dashboardApi = {
  /** Get aggregated dashboard statistics */
  getStats: () => 
    projectsClient.get<{ success: boolean; stats: DashboardStats }>('/dashboard/stats'),
  
  /** Get AI-generated dashboard summary */
  getSummary: () => 
    projectsClient.get<{
      success: boolean;
      stats: DashboardStats;
      aiInsights: string;
      topActions: string[];
      riskSummary: string;
    }>('/dashboard/summary'),
  
  /** Get "pending on whom" analysis */
  getPendingOnWhom: () => 
    projectsClient.get<{
      success: boolean;
      summary: string;
      topBlockers: Array<{
        owner: string;
        type: OwnerType;
        taskCount: number;
        analysis: string;
      }>;
      recommendations: string[];
      riskAreas: string[];
      byOwner: Array<{
        key: string;
        owner: string;
        type: OwnerType;
        taskCount: number;
        tasks: Array<{
          taskId: string;
          title: string;
          status: TaskStatus;
          dueDate?: string;
          projectId: string;
        }>;
      }>;
    }>('/dashboard/pending-on-whom'),
};

// =============================================================================
// PROJECTS API
// =============================================================================

export const projectsApi = {
  /** List all projects with optional filters */
  list: (options?: { status?: string; ownerId?: string; limit?: number; skip?: number }) => 
    projectsClient.get<{ success: boolean; projects: Project[] }>('/', { params: options }),
  
  /** Get a single project by ID */
  get: (projectId: string) => 
    projectsClient.get<{ success: boolean; project: Project }>(`/${projectId}`),
  
  /** Create a new project */
  create: (data: {
    name: string;
    description?: string;
    status?: ProjectStatus;
    priority?: TaskPriority;
    startDate?: string;
    targetEndDate?: string;
    linkedFolders?: string[];
    tags?: string[];
  }) => projectsClient.post<{ success: boolean; project: Project }>('/', data),
  
  /** Update a project */
  update: (projectId: string, data: Partial<Project>) => 
    projectsClient.put<{ success: boolean; project: Project }>(`/${projectId}`, data),
  
  /** Delete a project */
  delete: (projectId: string) => 
    projectsClient.delete<{ success: boolean; message: string }>(`/${projectId}`),
  
  /** Get AI summary for a project */
  getSummary: (projectId: string, refresh?: boolean) => 
    projectsClient.get<{ success: boolean; summary: ProjectAISummary }>(
      `/${projectId}/summary`,
      { params: { refresh: refresh ? 'true' : undefined } }
    ),
  
  /** Extract tasks from uploaded file */
  extractTasks: (projectId: string, file: File, autoCreate?: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('autoCreate', autoCreate ? 'true' : 'false');
    return uploadClient.post<{ success: boolean } & AIExtractionResult>(
      `/${projectId}/extract`,
      formData
    );
  },
  
  /** Process all pending synced files */
  processSyncedFiles: (projectId: string) => 
    projectsClient.post<{ success: boolean; processed: number; errors: number }>(
      `/${projectId}/process-synced`
    ),
};

// =============================================================================
// TASKS API
// =============================================================================

export const tasksApi = {
  /** List tasks for a project */
  listByProject: (projectId: string, options?: { status?: string; ownerType?: string }) => 
    projectsClient.get<{ success: boolean; tasks: Task[] }>(
      `/${projectId}/tasks`,
      { params: options }
    ),
  
  /** Filter tasks across all projects */
  filter: (filters: TaskFilterOptions) => {
    const params: any = { ...filters };
    if (filters.status) params.status = filters.status.join(',');
    if (filters.ownerType) params.ownerType = filters.ownerType.join(',');
    if (filters.priority) params.priority = filters.priority.join(',');
    return projectsClient.get<{ success: boolean; tasks: Task[] }>('/tasks/filter', { params });
  },
  
  /** Get a single task */
  get: (taskId: string) => 
    projectsClient.get<{ success: boolean; task: Task }>(`/tasks/${taskId}`),
  
  /** Create a task manually */
  create: (projectId: string, data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    ownerType?: OwnerType;
    ownerId?: string;
    ownerName?: string;
    dueDate?: string;
    dependsOn?: string[];
  }) => projectsClient.post<{ success: boolean; task: Task }>(`/${projectId}/tasks`, data),
  
  /** Update a task */
  update: (taskId: string, data: Partial<Task>) => 
    projectsClient.put<{ success: boolean; task: Task }>(`/tasks/${taskId}`, data),
  
  /** Add a comment to a task */
  addComment: (taskId: string, content: string) => 
    projectsClient.post<{ success: boolean; task: Task }>(`/tasks/${taskId}/comments`, { content }),
  
  /** Delete a task */
  delete: (taskId: string) => 
    projectsClient.delete<{ success: boolean; message: string }>(`/tasks/${taskId}`),
};

// =============================================================================
// VENDORS API
// =============================================================================

export const vendorsApi = {
  /** List all vendors */
  list: (status?: 'active' | 'inactive' | 'suspended') => 
    projectsClient.get<{ success: boolean; vendors: Vendor[] }>('/vendors', { params: { status } }),
  
  /** Get a vendor by ID */
  get: (vendorId: string) => 
    projectsClient.get<{ success: boolean; vendor: Vendor }>(`/vendors/${vendorId}`),
  
  /** Create a new vendor */
  create: (data: {
    name: string;
    contactName: string;
    contactEmail: string;
    phone?: string;
    address?: string;
    category?: string;
    portalEnabled?: boolean;
  }) => projectsClient.post<{ success: boolean; vendor: Vendor }>('/vendors', data),
  
  /** Update a vendor */
  update: (vendorId: string, data: Partial<Vendor>) => 
    projectsClient.put<{ success: boolean; vendor: Vendor }>(`/vendors/${vendorId}`, data),
};

// =============================================================================
// EXTERNAL EMPLOYEES API
// =============================================================================

export const externalsApi = {
  /** List all external employees */
  list: () => 
    projectsClient.get<{ success: boolean; externals: ExternalEmployee[] }>('/externals'),
  
  /** Create a new external employee */
  create: (data: {
    name: string;
    email: string;
    phone?: string;
    organization?: string;
    vendorId?: string;
    role?: string;
    portalEnabled?: boolean;
  }) => projectsClient.post<{ success: boolean; external: ExternalEmployee }>('/externals', data),
};

// =============================================================================
// ONEDRIVE API
// =============================================================================

export const onedriveApi = {
  /** Check if OneDrive is configured */
  getStatus: () => 
    projectsClient.get<{ success: boolean; configured: boolean }>('/onedrive/status'),
  
  /** Get OAuth authorization URL */
  getAuthUrl: (state?: string) => 
    projectsClient.get<{ success: boolean; authUrl: string }>(
      '/onedrive/auth-url',
      { params: { state } }
    ),
  
  /** List files in OneDrive */
  listFiles: (connectionId: string, path?: string) => 
    projectsClient.get<{ success: boolean; files: any[] }>(
      `/onedrive/${connectionId}/files`,
      { params: { path } }
    ),
  
  /** Trigger manual sync */
  sync: (connectionId: string, projectId?: string) => 
    projectsClient.post<{
      success: boolean;
      result: {
        connectionId: string;
        syncedAt: string;
        totalFiles: number;
        newFiles: number;
        updatedFiles: number;
        errors: Array<{ fileName: string; error: string }>;
      };
    }>(`/onedrive/${connectionId}/sync`, { projectId }),
};

// =============================================================================
// ACTIVITY LOGS API
// =============================================================================

export const activityLogsApi = {
  /** Get activity logs with optional filters */
  list: (options?: {
    entityType?: string;
    entityId?: string;
    limit?: number;
    skip?: number;
  }) => projectsClient.get<{
    success: boolean;
    logs: Array<{
      logId: string;
      timestamp: string;
      action: string;
      entityType: string;
      entityId: string;
      actorId: string;
      actorName: string;
      actorType: string;
      description?: string;
    }>;
  }>('/activity-logs', { params: options }),
};

// =============================================================================
// VENDOR PORTAL API (Separate authentication)
// =============================================================================

// Vendor Portal uses separate axios instance with Bearer auth
const portalClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/portal`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token interceptor
let portalToken: string | null = null;

export const setPortalToken = (token: string | null) => {
  portalToken = token;
};

portalClient.interceptors.request.use((config) => {
  if (portalToken) {
    config.headers['Authorization'] = `Bearer ${portalToken}`;
  }
  return config;
});

export const vendorPortalApi = {
  /** Login to vendor portal */
  login: (email: string, password: string) => 
    portalClient.post<{
      success: boolean;
      token: string;
      user: {
        type: 'vendor' | 'external';
        id: string;
        name: string;
        email: string;
      };
      expiresAt: string;
    }>('/login', { email, password }),
  
  /** Logout from vendor portal */
  logout: () => 
    portalClient.post<{ success: boolean; message: string }>('/logout'),
  
  /** Get current user info */
  getMe: () => 
    portalClient.get<{ success: boolean; user: Vendor | ExternalEmployee }>('/me'),
  
  /** Get tasks assigned to current user */
  getTasks: () => 
    portalClient.get<{
      success: boolean;
      tasks: Array<Task & { projectName: string }>;
    }>('/tasks'),
  
  /** Get a specific task */
  getTask: (taskId: string) => 
    portalClient.get<{
      success: boolean;
      task: Task & { projectName: string };
    }>(`/tasks/${taskId}`),
  
  /** Update a task (limited fields) */
  updateTask: (taskId: string, data: {
    percentComplete?: number;
    status?: TaskStatus;
    comment?: string;
    blockerReason?: string;
  }) => portalClient.put<{ success: boolean; task: Task }>(`/tasks/${taskId}`, data),
  
  /** Add a comment to a task */
  addComment: (taskId: string, content: string) => 
    portalClient.post<{ success: boolean; task: Task }>(
      `/tasks/${taskId}/comments`,
      { content }
    ),
};

// Admin functions for managing portal access
export const portalAdminApi = {
  /** Set portal password for a vendor/external user */
  setPassword: (userType: 'vendor' | 'external', userId: string, password: string, enablePortal?: boolean) => 
    projectsClient.post('/portal/admin/set-password', {
      userType,
      userId,
      password,
      enablePortal,
    }),
  
  /** List active portal sessions */
  listSessions: () => 
    projectsClient.get<{
      success: boolean;
      sessions: Array<{
        userType: string;
        userId: string;
        userName: string;
        createdAt: string;
        expiresAt: string;
      }>;
    }>('/portal/admin/sessions'),
  
  /** Revoke all sessions for a user */
  revokeSessions: (userId: string) => 
    projectsClient.delete<{ success: boolean; revokedCount: number }>(
      `/portal/admin/sessions/${userId}`
    ),
};

export default {
  dashboard: dashboardApi,
  projects: projectsApi,
  tasks: tasksApi,
  vendors: vendorsApi,
  externals: externalsApi,
  onedrive: onedriveApi,
  activityLogs: activityLogsApi,
  vendorPortal: vendorPortalApi,
  portalAdmin: portalAdminApi,
};
