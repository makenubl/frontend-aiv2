/**
 * OneDrive Sync API Client
 * Handles OneDrive shared folder sync and real-time progress tracking
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.REACT_APP_API_KEY || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
});

// Add auth header interceptor
api.interceptors.request.use((config) => {
  const userEmail = localStorage.getItem('userEmail');
  const userRole = localStorage.getItem('userRole');
  if (userEmail) config.headers['x-user-email'] = userEmail;
  if (userRole) config.headers['x-user-role'] = userRole;
  return config;
});

export interface ProgressEvent {
  type: string;
  timestamp: string;
  data: {
    message: string;
    fileName?: string;
    fileSize?: number;
    progress?: number;
    total?: number;
    aiModel?: string;
    tasksFound?: number;
    projectName?: string;
    error?: string;
    details?: any;
  };
}

export interface SyncSession {
  sessionId: string;
  status: 'pending' | 'syncing' | 'analyzing' | 'completed' | 'error';
  startedAt: string;
  projectId?: string;
  eventCount: number;
  result?: any;
  error?: string;
}

export interface Assignee {
  type: 'vendor' | 'external';
  id: string;
  name: string;
  email: string;
  organization?: string;
}

/**
 * Start a new OneDrive sync session
 */
export async function startSync(options: {
  sharedUrl: string;
  projectName?: string;
  autoAnalyze?: boolean;
  autoCreateTasks?: boolean;
}): Promise<{
  success: boolean;
  sessionId: string;
  projectId?: string;
  sseEndpoint: string;
}> {
  const response = await api.post('/onedrive-sync/start', options);
  return response.data;
}

/**
 * Subscribe to sync progress events via SSE
 */
export function subscribeToProgress(
  sessionId: string,
  onEvent: (event: ProgressEvent) => void,
  onError?: (error: any) => void,
  onComplete?: () => void
): () => void {
  const eventSource = new EventSource(
    `${API_URL}/onedrive-sync/progress/${sessionId}`
  );
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'stream_end') {
        eventSource.close();
        onComplete?.();
        return;
      }
      
      onEvent(data);
    } catch (e) {
      console.error('Error parsing SSE event:', e);
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    onError?.(error);
    eventSource.close();
  };
  
  // Return cleanup function
  return () => {
    eventSource.close();
  };
}

/**
 * Get sync session status
 */
export async function getSessionStatus(sessionId: string): Promise<{
  success: boolean;
  session: SyncSession;
}> {
  const response = await api.get(`/onedrive-sync/session/${sessionId}`);
  return response.data;
}

/**
 * List all sync sessions
 */
export async function listSessions(): Promise<{
  success: boolean;
  sessions: SyncSession[];
}> {
  const response = await api.get('/onedrive-sync/sessions');
  return response.data;
}

/**
 * Assign a task to a vendor or external employee
 */
export async function assignTask(options: {
  taskId: string;
  assigneeType: 'vendor' | 'external' | 'internal';
  assigneeId: string;
  assigneeName: string;
}): Promise<{ success: boolean; task: any }> {
  const response = await api.post('/onedrive-sync/assign-task', options);
  return response.data;
}

/**
 * Get all available assignees
 */
export async function getAssignees(): Promise<{
  success: boolean;
  assignees: Assignee[];
  vendors: any[];
  externals: any[];
}> {
  const response = await api.get('/onedrive-sync/assignees');
  return response.data;
}

/**
 * Create a new vendor
 */
export async function createVendor(vendor: {
  name: string;
  contactName?: string;
  contactEmail: string;
  phone?: string;
  category?: string;
}): Promise<{ success: boolean; vendor: any }> {
  const response = await api.post('/onedrive-sync/create-vendor', vendor);
  return response.data;
}

/**
 * Create a new external employee
 */
export async function createExternal(external: {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  vendorId?: string;
  role?: string;
}): Promise<{ success: boolean; external: any }> {
  const response = await api.post('/onedrive-sync/create-external', external);
  return response.data;
}

export default {
  startSync,
  subscribeToProgress,
  getSessionStatus,
  listSessions,
  assignTask,
  getAssignees,
  createVendor,
  createExternal,
};
