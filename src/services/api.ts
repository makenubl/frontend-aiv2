import axios, { AxiosInstance } from 'axios';

// Use relative URL for Vercel deployment, or full URL for local development
const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api'
);

console.log('🔗 API Base URL:', API_BASE_URL);

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.REACT_APP_API_KEY || 'dev-key-12345',
  },
});

// Separate client for file uploads (without Content-Type header so axios can set multipart boundary)
const uploadClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'x-api-key': process.env.REACT_APP_API_KEY || 'dev-key-12345',
  },
});

console.log('✅ Upload client configured for:', API_BASE_URL);

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
    return uploadClient.post('/evaluation/upload', formData);
  },
};

export default apiClient;

// Storage APIs for folders and uploads
export const storageApi = {
  createFolder: (name: string) =>
    apiClient.post('/storage/folders', { name }),

  deleteFolder: (folder: string) =>
    apiClient.delete('/storage/folders', { data: { folder, requesterEmail: 'user@example.com' } }),

  listFolders: () =>
    apiClient.get('/storage/folders'),

  listFiles: (folder: string) =>
    apiClient.get('/storage/files', { params: { folder } }),

  uploadToFolder: (folder: string, files: File[]) => {
    console.log('📤 uploadToFolder called with:', { folder, fileCount: files.length, fileNames: files.map(f => f.name) });
    const formData = new FormData();
    formData.append('folder', folder);
    files.forEach(file => {
      console.log('  Adding file:', file.name, 'Size:', file.size, 'Type:', file.type);
      formData.append('files', file);
    });
    console.log('📨 Posting to /storage/upload');
    return uploadClient.post('/storage/upload', formData).then(response => {
      console.log('✅ Upload response received:', response.status, response.data);
      return response;
    }).catch(error => {
      console.error('❌ Upload error:', error.response?.status, error.response?.data || error.message);
      throw error;
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

  chatAboutRecommendations: (folder: string, document: string | undefined, message: string) =>
    apiClient.post('/storage/chat', { folder, document, message }, {
      headers: {
        'x-user-role': 'owner',
        'x-user-email': 'user@example.com'
      }
    }),

  getStorageChat: (folder: string, document?: string) =>
    apiClient.get('/storage/chat', { params: { folder, document } }),

  inviteToFolder: (folder: string, email: string, role: string) =>
    apiClient.post('/storage/access/invite', { folder, email, role }),

  applyChangesWithGPT: (folder: string, document: string, recommendations: any[]) =>
    apiClient.post('/storage/apply-changes', { folder, document, recommendations }),

  deleteFile: (folder: string, fileName: string) =>
    apiClient.delete('/storage/files', { data: { folder, fileName } }),
};
