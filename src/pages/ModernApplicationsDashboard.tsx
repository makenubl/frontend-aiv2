import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiClock, FiXCircle, FiAlertTriangle, FiLogOut, FiRefreshCw, FiFileText, FiShield, FiTrendingUp, FiZap, FiGlobe } from 'react-icons/fi';
import { applicationsApi, ApplicationFolder, ComprehensiveEvaluation } from '../services/applications.api';
import { ApplicationDetailView } from '../components/ApplicationDetailView';
import '../styles/premium.css';
import '../styles/modern-dashboard.css';

interface ModernDashboardProps {
  onLogout?: () => void;
}

export const ModernApplicationsDashboard: React.FC<ModernDashboardProps> = ({ onLogout }) => {
  const [applications, setApplications] = useState<ApplicationFolder[]>([]);
  const [selectedApp, setSelectedApp] = useState<ApplicationFolder | null>(null);
  const [evaluation, setEvaluation] = useState<ComprehensiveEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await applicationsApi.scanApplications();
      setApplications(result.applications);
    } catch (err) {
      setError('Failed to load applications. Please check backend connection.');
      console.error('Error loading applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectApplication = async (app: ApplicationFolder, forceRefresh: boolean = false) => {
    setSelectedApp(app);
    setEvaluation(null);
    
    try {
      setEvaluating(true);
      const result = await applicationsApi.evaluateApplication(app.id, forceRefresh);
      setEvaluation(result.evaluation);
    } catch (err) {
      console.error('Error evaluating application:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleRefreshEvaluation = () => {
    if (selectedApp) {
      handleSelectApplication(selectedApp, true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'evaluated': return 'info';
      case 'processing': return 'warning';
      default: return 'info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <FiCheckCircle />;
      case 'rejected': return <FiXCircle />;
      case 'evaluated': return <FiShield />;
      case 'processing': return <FiClock />;
      default: return <FiFileText />;
    }
  };

  const getRiskBadgeClass = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'low': return 'badge-success';
      case 'medium': return 'badge-warning';
      case 'high': case 'critical': return 'badge-error';
      default: return 'badge-info';
    }
  };

  if (loading) {
    return (
      <div className="modern-dashboard loading-state">
        <div className="loading-spinner"></div>
        <p className="text-sm text-secondary">Loading applications...</p>
      </div>
    );
  }

  return (
    <div className="modern-dashboard">
      {/* Header */}
      <header className="dashboard-header-modern glass-dark">
        <div className="header-container">
          <div className="header-left">
            <img src="/pvara-logo.png" alt="Pvara" className="pvara-logo" />
            <div>
              <h1 className="text-2xl font-bold">Pvara AI Platform</h1>
              <p className="text-xs text-secondary opacity-75">AI-Powered Licensing & No Objection Certificate Evaluation</p>
            </div>
          </div>
          <div className="header-actions">
            <button onClick={loadApplications} className="btn btn-secondary btn-sm">
              <FiRefreshCw /> Refresh
            </button>
            {onLogout && (
              <button onClick={onLogout} className="btn btn-secondary btn-sm">
                <FiLogOut /> Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="stats-container">
        <div className="stat-card card-glass">
          <div className="stat-icon" style={{background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)'}}>
            <FiFileText />
          </div>
          <div className="stat-content">
            <p className="stat-label text-xs text-secondary">Total Applications</p>
            <p className="stat-value text-xl font-bold">{applications.length}</p>
          </div>
        </div>
        <div className="stat-card card-glass">
          <div className="stat-icon" style={{background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'}}>
            <FiCheckCircle />
          </div>
          <div className="stat-content">
            <p className="stat-label text-xs text-secondary">Approved</p>
            <p className="stat-value text-xl font-bold">
              {applications.filter(a => a.status === 'approved').length}
            </p>
          </div>
        </div>
        <div className="stat-card card-glass">
          <div className="stat-icon" style={{background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'}}>
            <FiClock />
          </div>
          <div className="stat-content">
            <p className="stat-label text-xs text-secondary">Under Review</p>
            <p className="stat-value text-xl font-bold">
              {applications.filter(a => a.status === 'pending' || a.status === 'processing').length}
            </p>
          </div>
        </div>
        <div className="stat-card card-glass">
          <div className="stat-icon" style={{background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'}}>
            <FiShield />
          </div>
          <div className="stat-content">
            <p className="stat-label text-xs text-secondary">Evaluated</p>
            <p className="stat-value text-xl font-bold">
              {applications.filter(a => a.status === 'evaluated').length}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner card-glass">
          <FiAlertTriangle />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="dashboard-content">
        {/* Applications List */}
        <div className="applications-section">
          <h2 className="section-title text-md font-semibold">Applications</h2>
          <div className="applications-grid">
            {applications.map((app) => (
              <div
                key={app.id}
                className={`application-card-modern card-glass ${selectedApp?.id === app.id ? 'selected' : ''}`}
                onClick={() => handleSelectApplication(app)}
              >
                <div className="card-header-row">
                  <div className={`badge badge-${getStatusColor(app.status)}`}>
                    {getStatusIcon(app.status)}
                    <span>{app.status}</span>
                  </div>
                  <span className="text-xs text-tertiary">
                    {new Date(app.submittedAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-sm font-semibold" style={{marginTop: '0.75rem'}}>
                  {app.applicationData.companyName}
                </h3>
                <p className="text-xs text-secondary" style={{marginTop: '0.25rem'}}>
                  {app.applicationData.appName}
                </p>
                <div className="app-metrics" style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.75rem'
                }}>
                  <div className="metric" style={{
                    textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px'
                  }}>
                    <span className="metric-value" style={{ color: 'rgba(255,255,255,0.92)', fontSize: '1.2rem', fontWeight: 700 }}>{app.applicationData?.teamSize || 0}</span>
                    <span className="metric-label" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem' }}>Team Size</span>
                  </div>
                  <div className="metric" style={{
                    textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px'
                  }}>
                    <span className="metric-value" style={{ color: 'rgba(255,255,255,0.92)', fontSize: '1.2rem', fontWeight: 700 }}>{app.applicationData?.aiCapabilities?.length || 0}</span>
                    <span className="metric-label" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem' }}>AI Features</span>
                  </div>
                  <div className="metric" style={{
                    textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px'
                  }}>
                    <span className="metric-value" style={{ color: 'rgba(255,255,255,0.92)', fontSize: '1.2rem', fontWeight: 700 }}>
                      ${((app.applicationData?.financialProjections?.year1Revenue || 0) / 1000000).toFixed(1)}M
                    </span>
                    <span className="metric-label" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem' }}>Year 1 Rev</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedApp && (
          <div className="detail-panel">
            {evaluating ? (
              <div className="evaluation-loading card-glass">
                <div className="loading-spinner-lg"></div>
                <p className="text-sm font-medium">Performing AI Evaluation with GPT-5.1...</p>
                <p className="text-xs text-secondary">Analyzing compliance, risk, regulatory requirements, and technical aspects</p>
              </div>
            ) : evaluation ? (
              <>
                <div className="evaluation-actions" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button 
                    onClick={handleRefreshEvaluation}
                    className="btn btn-secondary btn-sm"
                    title="Force re-evaluation with GPT-5.1"
                  >
                    <FiRefreshCw /> Re-evaluate with GPT-5.1
                  </button>
                </div>
                <ApplicationDetailView application={selectedApp} evaluation={evaluation} />
              </>
            ) : (
              <div className="no-evaluation card-glass">
                <FiShield size={48} opacity={0.3} />
                <p className="text-sm text-secondary">Select an application to view evaluation</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
