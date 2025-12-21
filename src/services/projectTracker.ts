/**
 * Project Tracker API Service
 * 
 * Frontend service for interacting with the Project Tracker wizard backend
 */

import api, { uploadClient } from './api';

// Types
export interface WizardSession {
  sessionId: string;
  projectId?: string;
  projectName?: string;
  storageFolderName?: string; // Links to Storage & AI Chat folder
  files: UploadedFile[];
  status: 'draft' | 'uploading' | 'analyzing' | 'reviewing' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface UploadedFile {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  s3Url?: string;
  s3Key?: string;
  uploadedAt: string;
  analysisStatus: 'pending' | 'analyzing' | 'completed' | 'error';
  extractedTasksCount?: number;
}

export interface Project {
  projectId: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'on-hold' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  ownerId: string;
  ownerName: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  taskSummary?: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
    notStarted: number;
  };
}

export interface ExtractedTask {
  id: string;
  title: string;
  description?: string;
  type: 'task' | 'action_item' | 'deliverable' | 'deadline';
  dueDate?: string;
  deadline?: string;
  inferredOwner?: string;
  inferredOwnerType?: 'internal' | 'external' | 'vendor' | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  context?: string;
  sourceText?: string;
  reasoning?: string;
  sourceFile?: string;
  sourceFileId?: string;
  // For assignment
  assignedTo?: string;
  assigneeType?: 'vendor' | 'external';
  ownerId?: string;
  ownerName?: string;
  ownerType?: 'internal' | 'external' | 'vendor';
  // Selection state (frontend only)
  selected?: boolean;
}

export interface Task {
  taskId: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  ownerId?: string;
  ownerName?: string;
  ownerType?: 'internal' | 'external' | 'vendor';
  aiExtracted?: boolean;
  aiConfidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  _id: string;
  vendorId?: string;
  name: string;
  company: string;
  contactName?: string;
  email: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  category?: string;
  specialty?: string;
  status: 'active' | 'inactive' | 'pending';
  notes?: string;
  createdAt?: string;
}

export interface ExternalEmployee {
  _id: string;
  externalId?: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  company: string;
  vendorId?: string;
  role?: string;
  department?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt?: string;
}

export interface Assignee {
  id: string;
  name: string;
  email: string;
  type: 'vendor' | 'external';
  company: string;
  organization?: string;
  category?: string;
  role?: string;
  vendorId?: string;
}

// Project Info for wizard
export interface ProjectInfo {
  name: string;
  description?: string;
  tags?: string[];
}

export interface AnalysisResult {
  fileId: string;
  fileName: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  tasksFound?: number;
  error?: string;
  tasks?: ExtractedTask[];
}

// API Functions

/**
 * Start a new wizard session
 */
export const startWizardSession = async (): Promise<{ sessionId: string }> => {
  const response = await api.post('/project-tracker/session/start');
  return response.data;
};

/**
 * Get wizard session status
 */
export const getWizardSession = async (sessionId: string): Promise<WizardSession> => {
  const response = await api.get(`/project-tracker/session/${sessionId}`);
  return response.data.session;
};

/**
 * Create a new project
 */
export const createProject = async (data: {
  name: string;
  description?: string;
  tags?: string[];
  sessionId?: string;
  status?: string;
}): Promise<Project> => {
  const response = await api.post('/project-tracker/projects', data);
  return response.data.project;
};

/**
 * Get all projects
 */
export const getProjects = async (): Promise<Project[]> => {
  const response = await api.get('/project-tracker/projects');
  return response.data.projects;
};

/**
 * Get project by ID
 */
export const getProject = async (projectId: string): Promise<Project> => {
  const response = await api.get(`/project-tracker/projects/${projectId}`);
  return response.data.project;
};

/**
 * Update project
 */
export const updateProject = async (projectId: string, data: Partial<Project>): Promise<Project> => {
  const response = await api.put(`/project-tracker/projects/${projectId}`, data);
  return response.data.project;
};

/**
 * Upload files to a wizard session
 * Files are uploaded to Storage & AI Chat system (S3 + MongoDB)
 * A storage folder is created with the project name
 */
export const uploadFiles = async (
  sessionId: string,
  files: File[],
  projectName?: string,
  onProgress?: (percent: number) => void
): Promise<{ files: UploadedFile[]; storageFolderName?: string }> => {
  const formData = new FormData();
  formData.append('sessionId', sessionId);
  if (projectName) formData.append('projectName', projectName);
  files.forEach(file => formData.append('files', file));
  
  // Use uploadClient which doesn't have Content-Type preset, allowing axios to set multipart boundary
  const response = await uploadClient.post('/project-tracker/files/upload', formData, {
    onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
  
  return { 
    files: response.data.files,
    storageFolderName: response.data.storageFolderName 
  };
};

/**
 * Get files in a session
 */
export const getSessionFiles = async (sessionId: string): Promise<UploadedFile[]> => {
  const response = await api.get(`/project-tracker/files/${sessionId}`);
  return response.data.files;
};

/**
 * Delete a file from session
 */
export const deleteFile = async (sessionId: string, fileId: string): Promise<void> => {
  await api.delete(`/project-tracker/files/${sessionId}/${fileId}`);
};

/**
 * Load existing files from an S3 storage folder into the wizard session
 * This downloads files from S3, extracts text, and prepares them for AI analysis
 */
export const loadExistingFiles = async (
  sessionId: string,
  folderName: string,
  files: Array<{ name: string; size?: number; mimeType?: string; s3Key?: string }>
): Promise<{
  loadedFiles: UploadedFile[];
  errors: Array<{ fileName: string; error: string }>;
  duration: string;
}> => {
  const startTime = performance.now();
  const endpoint = `/project-tracker/load-existing-files/${sessionId}`;
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📂 LOAD EXISTING FILES API REQUEST');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📍 Endpoint:', endpoint);
  console.log('📁 Folder:', folderName);
  console.log('📄 Files:', files.length);
  console.log('🕐 Request Time:', new Date().toISOString());
  console.log('───────────────────────────────────────────────────────────────');
  
  try {
    const response = await api.post(endpoint, { folderName, files });
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ LOAD EXISTING FILES API RESPONSE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('⏱️ Duration:', duration, 'seconds');
    console.log('📄 Files Loaded:', response.data.loadedFiles?.length || 0);
    console.log('❌ Errors:', response.data.errors?.length || 0);
    console.log('───────────────────────────────────────────────────────────────');
    
    return response.data;
  } catch (error: any) {
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('❌ LOAD EXISTING FILES API ERROR');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('⏱️ Duration:', duration, 'seconds');
    console.log('📛 Error:', error.message);
    console.log('═══════════════════════════════════════════════════════════════');
    
    throw error;
  }
};

/**
 * Analyze files with AI
 */
export const analyzeFiles = async (
  sessionId: string,
  projectName?: string,
  customPrompt?: string
): Promise<{
  totalTasks: number;
  results: AnalysisResult[];
  tasks: ExtractedTask[];
}> => {
  const startTime = performance.now();
  const requestPayload = { projectName, customPrompt };
  const endpoint = `/project-tracker/analyze/${sessionId}`;
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🤖 AI ANALYSIS API REQUEST');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📍 Endpoint:', endpoint);
  console.log('📦 Request Payload:', JSON.stringify(requestPayload, null, 2));
  console.log('🕐 Request Time:', new Date().toISOString());
  console.log('───────────────────────────────────────────────────────────────');
  
  try {
    const response = await api.post(endpoint, requestPayload);
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ AI ANALYSIS API RESPONSE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('⏱️ Duration:', duration, 'seconds');
    console.log('📊 Status:', response.status);
    console.log('📋 Total Tasks Found:', response.data.totalTasks);
    console.log('📁 Files Analyzed:', response.data.results?.length || 0);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📄 Full Response Data:', JSON.stringify(response.data, null, 2));
    console.log('═══════════════════════════════════════════════════════════════');
    
    return response.data;
  } catch (error: any) {
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('❌ AI ANALYSIS API ERROR');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('⏱️ Duration:', duration, 'seconds');
    console.log('🔴 Error Status:', error.response?.status || 'Network Error');
    console.log('📛 Error Message:', error.message);
    console.log('📄 Error Response:', JSON.stringify(error.response?.data, null, 2));
    console.log('═══════════════════════════════════════════════════════════════');
    
    throw error;
  }
};

/**
 * Get analysis results
 */
export const getAnalysisResults = async (sessionId: string): Promise<{
  status: string;
  totalTasks: number;
  files: AnalysisResult[];
  tasks: ExtractedTask[];
}> => {
  const response = await api.get(`/project-tracker/analysis/${sessionId}`);
  return response.data;
};

/**
 * Create tasks
 */
export const createTasks = async (projectId: string, tasks: ExtractedTask[]): Promise<Task[]> => {
  const response = await api.post('/project-tracker/tasks', { projectId, tasks });
  return response.data.tasks;
};

/**
 * Get tasks for a project
 */
export const getProjectTasks = async (projectId: string): Promise<Task[]> => {
  const response = await api.get(`/project-tracker/tasks/${projectId}`);
  return response.data.tasks;
};

/**
 * Update a task
 */
export const updateTask = async (taskId: string, data: Partial<Task>): Promise<Task> => {
  const response = await api.put(`/project-tracker/tasks/${taskId}`, data);
  return response.data.task;
};

/**
 * Assign a task
 */
export const assignTask = async (
  taskId: string,
  ownerId: string,
  ownerName: string,
  ownerType: 'internal' | 'external' | 'vendor'
): Promise<Task> => {
  const response = await api.post(`/project-tracker/tasks/${taskId}/assign`, {
    ownerId,
    ownerName,
    ownerType,
  });
  return response.data.task;
};

/**
 * Get all vendors
 */
export const getVendors = async (): Promise<Vendor[]> => {
  const response = await api.get('/project-tracker/vendors');
  return response.data.vendors;
};

/**
 * Create a vendor
 */
export const createVendor = async (data: {
  name: string;
  contactEmail: string;
  contactName?: string;
  phone?: string;
  address?: string;
  category?: string;
  notes?: string;
}): Promise<Vendor> => {
  const response = await api.post('/project-tracker/vendors', data);
  return response.data.vendor;
};

/**
 * Update a vendor
 */
export const updateVendor = async (vendorId: string, data: Partial<Vendor>): Promise<Vendor> => {
  const response = await api.put(`/project-tracker/vendors/${vendorId}`, data);
  return response.data.vendor;
};

/**
 * Get all external employees
 */
export const getExternals = async (): Promise<ExternalEmployee[]> => {
  const response = await api.get('/project-tracker/externals');
  return response.data.externals;
};

/**
 * Create an external employee
 */
export const createExternal = async (data: {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  vendorId?: string;
  role?: string;
  notes?: string;
}): Promise<ExternalEmployee> => {
  const response = await api.post('/project-tracker/externals', data);
  return response.data.external;
};

/**
 * Update an external employee
 */
export const updateExternal = async (externalId: string, data: Partial<ExternalEmployee>): Promise<ExternalEmployee> => {
  const response = await api.put(`/project-tracker/externals/${externalId}`, data);
  return response.data.external;
};

/**
 * Get all assignees (vendors + externals combined) from API
 */
export const fetchAssignees = async (): Promise<{
  assignees: Assignee[];
  vendors: Vendor[];
  externals: ExternalEmployee[];
}> => {
  const response = await api.get('/project-tracker/assignees');
  return response.data;
};

/**
 * Combine vendors and externals into a single assignees list (synchronous helper)
 */
export const getAssignees = (vendors: Vendor[], externals: ExternalEmployee[]): Assignee[] => {
  const assignees: Assignee[] = [];
  
  vendors.forEach(v => {
    assignees.push({
      id: v._id,
      name: v.name,
      email: v.email || v.contactEmail || '',
      type: 'vendor',
      company: v.company || v.name,
      category: v.category,
    });
  });
  
  externals.forEach(e => {
    assignees.push({
      id: e._id,
      name: e.name,
      email: e.email,
      type: 'external',
      company: e.company || e.organization || '',
      role: e.role,
      vendorId: e.vendorId,
    });
  });
  
  return assignees;
};

// =============================================================================
// AUDIT TRAIL
// =============================================================================

export interface AuditLogEntry {
  logId: string;
  timestamp: string;
  action: string;
  entityType: 'project' | 'task' | 'document' | 'vendor' | 'external';
  entityId: string;
  actorId: string;
  actorName: string;
  actorType: 'internal' | 'external' | 'vendor' | 'system' | 'ai';
  previousValue?: any;
  newValue?: any;
  description?: string;
}

/**
 * Get audit logs for a specific project
 */
export const getProjectAuditLogs = async (
  projectId: string,
  limit: number = 100
): Promise<AuditLogEntry[]> => {
  const response = await api.get(`/project-tracker/audit/${projectId}`, {
    params: { limit },
  });
  return response.data.logs;
};

/**
 * Get all audit logs with optional filters
 */
export const getAuditLogs = async (filters?: {
  entityType?: string;
  actorId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> => {
  const response = await api.get('/project-tracker/audit', {
    params: filters,
  });
  return response.data.logs;
};

/**
 * Finalize wizard session - create project and tasks
 */
export const finalizeWizard = async (
  sessionId: string,
  data: {
    projectInfo: ProjectInfo;
    files: UploadedFile[];
    tasks: ExtractedTask[];
    existingProjectId?: string; // Optional: if provided, adds to existing project instead of creating new
  }
): Promise<{
  projectId: string;
  tasksCreated: number;
  tasks: Task[];
}> => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🏁 FINALIZE WIZARD - SENDING TO BACKEND');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📍 Session ID:', sessionId);
  console.log('📁 Project Info:', data.projectInfo);
  console.log('📄 Files:', data.files.length);
  console.log('📋 Tasks to save:', data.tasks.length);
  if (data.tasks.length > 0) {
    console.log('📝 Task details:');
    data.tasks.forEach((t, i) => {
      console.log(`   ${i + 1}. "${t.title}" - Owner: ${t.ownerName || 'N/A'} (${t.ownerType || 'N/A'})`);
    });
  }
  console.log('───────────────────────────────────────────────────────────────');
  console.log('Full request data:', JSON.stringify(data, null, 2));
  console.log('═══════════════════════════════════════════════════════════════');
  
  const response = await api.post(`/project-tracker/finalize/${sessionId}`, data);
  
  console.log('✅ Finalize response:', response.data);
  return response.data;
};

// Helper functions

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Get file icon based on mime type
 */
export const getFileIcon = (mimeType: string): string => {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('text')) return '📃';
  return '📁';
};

/**
 * Get priority color
 */
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#22c55e';
    default: return '#6b7280';
  }
};

/**
 * Get confidence color
 */
export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return '#22c55e';
  if (confidence >= 0.6) return '#eab308';
  if (confidence >= 0.4) return '#f97316';
  return '#ef4444';
};
