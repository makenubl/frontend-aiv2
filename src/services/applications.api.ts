import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.REACT_APP_API_KEY || 'dev-key-12345';

// Helper to get current user role from localStorage
const getUserRole = (): string => {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.state?.user?.role || 'reviewer';
    }
  } catch {
    // Ignore parse errors
  }
  return 'reviewer';
};

// Helper to get current user email from localStorage
const getUserEmail = (): string => {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.state?.user?.email || '';
    }
  } catch {
    // Ignore parse errors
  }
  return '';
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
  }
});

// Add request interceptor to include role headers
api.interceptors.request.use((config) => {
  config.headers['x-user-role'] = getUserRole();
  config.headers['x-user-email'] = getUserEmail();
  return config;
});

export interface ApplicationFolder {
  id: string;
  folderPath: string;
  applicationData: any;
  documents: string[];
  submittedAt: string;
  status: 'pending' | 'processing' | 'evaluated' | 'approved' | 'rejected';
}

export interface EvaluationComment {
  category: 'compliance' | 'risk' | 'technical' | 'business' | 'regulatory' | 'recommendation';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  evaluatedAt: string;
}

export interface ComprehensiveEvaluation {
  applicationId: string;
  overallScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  recommendation: 'approve' | 'conditional-approval' | 'reject' | 'needs-review';
  complianceScore: number;
  technicalScore: number;
  businessScore: number;
  regulatoryScore: number;
  comments: EvaluationComment[];
  dueDiligenceChecks: any;
  aiInsights: string;
  aiDocumentCategories?: Array<{ name: string; category: string; subcategory: string; relevanceScore: number; notes: string }>;
  modelUsed?: string;
  nextSteps: string[];
  conditions: string[];
  evaluatedAt: string;
}

export const applicationsApi = {
  // Scan applications folder
  async scanApplications(): Promise<{ success: boolean; count: number; applications: ApplicationFolder[] }> {
    const response = await api.get('/applications/scan');
    return response.data;
  },

  // Get single application
  async getApplication(id: string): Promise<{ success: boolean; application: ApplicationFolder }> {
    const response = await api.get(`/applications/${id}`);
    return response.data;
  },

  // Evaluate application (with optional refresh to force GPT-5.1 re-evaluation)
  async evaluateApplication(id: string, refresh: boolean = false): Promise<{ success: boolean; evaluation: ComprehensiveEvaluation }> {
    const response = await api.get(`/applications/${id}/evaluate`, {
      params: refresh ? { refresh: 'true' } : {}
    });
    return response.data;
  },

  // Refresh all evaluations (clear all caches)
  async refreshAllEvaluations(): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/applications/refresh-all');
    return response.data;
  }
};

export default api;
