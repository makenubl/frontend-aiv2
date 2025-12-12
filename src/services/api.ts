import axios, { AxiosInstance } from 'axios';

// Use relative URL for Vercel deployment, or full URL for local development
const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api'
);

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.REACT_APP_API_KEY || 'dev-key-12345',
  },
});

export const evaluationApi = {
  evaluateApplication: (data: any) =>
    apiClient.post('/evaluation/evaluate', data),

  voiceCommand: (transcript: string, applicationId: string) =>
    apiClient.post('/evaluation/voice-command', { transcript, applicationId }),

  getApplication: (id: string) =>
    apiClient.get(`/evaluation/applications/${id}`),

  listApplications: () =>
    apiClient.get('/evaluation/applications'),

  uploadFiles: (files: File[], meta?: { applicationId?: string; name?: string; vendor?: string; version?: string; description?: string }) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (meta?.applicationId) formData.append('applicationId', meta.applicationId);
    if (meta?.name) formData.append('name', meta.name);
    if (meta?.vendor) formData.append('vendor', meta.vendor);
    if (meta?.version) formData.append('version', meta.version);
    if (meta?.description) formData.append('description', meta.description);
    return apiClient.post('/evaluation/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default apiClient;

// Storage APIs for folders and uploads
export const storageApi = {
  createFolder: (name: string) =>
    apiClient.post('/storage/folders', { name }),

  listFolders: () =>
    apiClient.get('/storage/folders'),

  listFiles: (folder: string) =>
    apiClient.get('/storage/files', { params: { folder } }),

  uploadToFolder: (folder: string, files: File[]) => {
    const formData = new FormData();
    formData.append('folder', folder);
    files.forEach(file => formData.append('files', file));
    return apiClient.post('/storage/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listRecommendations: (folder: string, document?: string) =>
    apiClient.get('/storage/recommendations', { params: { folder, document } }),

  decideRecommendations: (
    folder: string,
    document: string,
    version: number,
    acceptIds: string[],
    rejectIds: string[]
  ) => apiClient.post('/storage/recommendations/decision', {
    folder,
    document,
    version,
    acceptIds,
    rejectIds,
  }),
};
