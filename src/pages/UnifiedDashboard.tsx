import React, { useState, useEffect } from 'react';
import { 
  FiHome, FiFileText, FiShield, FiFolder, 
  FiSettings, FiLogOut, FiMenu, FiX, FiBell,
  FiClock, FiTrendingUp,
  FiGlobe, FiChevronDown, FiFile
} from 'react-icons/fi';
import StorageManagerV2 from '../components/StorageManagerV2';
import DocumentChatPage from './DocumentChatPage';
import { applicationsApi, ApplicationFolder, ComprehensiveEvaluation } from '../services/applications.api';
import { NOCCreationPanel } from '../components/NOCCreationPanel';
import '../styles/ultra-premium.css';

interface UnifiedDashboardProps {
  onLogout?: () => void;
}

type ActiveView = 'applications' | 'noc' | 'settings' | 'storage' | 'document-chat';

interface DocumentChatState {
  documentName: string;
  folderName: string;
}

export const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({ onLogout }) => {
  const [applications, setApplications] = useState<ApplicationFolder[]>([]);
  const [selectedApp, setSelectedApp] = useState<ApplicationFolder | null>(null);
  const [evaluation, setEvaluation] = useState<ComprehensiveEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('applications');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [scoreDetail, setScoreDetail] = useState<{ label: string; score: number; items: string[] } | null>(null);
  const [logoLoadError, setLogoLoadError] = useState<Record<string, boolean>>({});
  const [showDocsPreview, setShowDocsPreview] = useState<string | null>(null);
  const [documentChatState, setDocumentChatState] = useState<DocumentChatState | null>(null);
  const [showNewApp, setShowNewApp] = useState(false);
  const [newAppMeta, setNewAppMeta] = useState({ name: '', vendor: '', version: '', description: '' });
  const [newAppFiles, setNewAppFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadApplications = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await applicationsApi.scanApplications();
      setApplications(result.applications);
      // Auto-select first application so downstream views (Documents/NOC) work immediately
      if (result.applications.length > 0 && !selectedApp) {
        setSelectedApp(result.applications[0]);
      }
    } catch (err) {
      console.error('Error loading applications:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedApp]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const evaluateApplication = async (appId: string, forceRefresh: boolean = false) => {
    try {
      setEvaluating(true);
      const result = await applicationsApi.evaluateApplication(appId, forceRefresh);
      setEvaluation(result.evaluation);
      setShowEvalModal(true);
    } catch (err) {
      console.error('Error evaluating application:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleRefreshEvaluation = () => {
    if (evaluation?.applicationId) {
      evaluateApplication(evaluation.applicationId, true);
    }
  };

  const handleCreateAndEvaluate = async () => {
    if (isSubmitting || newAppFiles.length === 0 || !newAppMeta.name) return;
    try {
      setIsSubmitting(true);
      const apiClient = (await import('../services/api')).evaluationApi;
      const resp = await apiClient.uploadFiles(newAppFiles, {
        name: newAppMeta.name,
        vendor: newAppMeta.vendor,
        version: newAppMeta.version,
        description: newAppMeta.description,
      });
      const { application } = resp.data;
      const newFolder: ApplicationFolder = {
        id: application.id,
        folderPath: `applications/${application.id}`,
        applicationData: { companyName: application.vendor, name: application.name },
        documents: [],
        submittedAt: new Date().toISOString(),
        status: 'pending'
      };
      setApplications([newFolder, ...applications]);
      setSelectedApp(newFolder);
      setShowNewApp(false);
      setNewAppFiles([]);
    } catch (err) {
      console.error('Create & Evaluate failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelNewApp = () => {
    setShowNewApp(false);
    setNewAppMeta({ name: '', vendor: '', version: '', description: '' });
    setNewAppFiles([]);
  };

  const getRiskColor = (level: string) => {
    const colors: Record<string, string> = {
      low: '#10b981',
      medium: '#fbbf24',
      high: '#f97316',
      critical: '#ef4444',
    };
    return colors[level] || '#94a3b8';
  };

  const stats = {
    total: applications.length,
    approved: applications.filter(a => a.status === 'approved').length,
    pending: applications.filter(a => a.status === 'pending').length,
    processing: applications.filter(a => a.status === 'processing').length,
  };

    const getLogoForCompany = (name?: string) => {
      const company = (name || '').toLowerCase();
      if (company.includes('binance')) {
        return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Binance_Logo.png/320px-Binance_Logo.png';
      }
      if (company.includes('htx') || company.includes('huobi')) {
        return 'https://assets.coingecko.com/coins/images/2829/large/huobi-token-logo.png';
      }
      return null;
    };

  const menuItems = [
    { id: 'applications', label: 'Applications', icon: <FiHome />, badge: stats.total },
    { id: 'noc', label: 'No Objection Certificate', icon: <FiShield />, badge: stats.pending },
    { id: 'storage', label: 'Storage & AI Chat', icon: <FiFolder />, badge: null },
    { id: 'settings', label: 'Settings', icon: <FiSettings />, badge: null },
  ];

  const handleOpenDocumentChat = (documentName: string, folderName: string) => {
    setDocumentChatState({ documentName, folderName });
    setActiveView('document-chat');
  };

  const handleCloseDocumentChat = () => {
    setDocumentChatState(null);
    setActiveView('storage');
  };

  const renderContent = () => {
    switch (activeView) {
      case 'applications':
        return renderApplicationsView();
      case 'noc':
        return (
          <NOCCreationPanel 
            applications={applications}
            selectedApplication={selectedApp || undefined}
            onSelectApplication={setSelectedApp}
            evaluation={evaluation || undefined}
            onBack={() => setActiveView('applications')}
            onEvaluate={evaluateApplication}
          />
        );
      case 'storage':
        return (
          <div style={{ position: 'absolute', inset: 0, paddingTop: '81px' }}>
            <StorageManagerV2 onOpenDocumentChat={handleOpenDocumentChat} />
          </div>
        );
      case 'document-chat':
        if (documentChatState) {
          return (
            <DocumentChatPage
              documentName={documentChatState.documentName}
              folderName={documentChatState.folderName}
              onBack={handleCloseDocumentChat}
            />
          );
        }
        return renderApplicationsView();
      case 'settings':
        return renderSettingsView();
      default:
        return renderApplicationsView();
    }
  };

  const renderApplicationsView = () => (
    <div style={{ padding: 'var(--space-2xl)' }}>
      {/* Stats Bar */}
      <div className="stats-bar" style={{ marginBottom: 'var(--space-2xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
        <div className="stat-item">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Applications</span>
        </div>
        <div className="stat-item">
          <span className="stat-value" style={{ background: 'linear-gradient(135deg, #10b981 0%, #38ef7d 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stats.approved}
          </span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="stat-item">
          <span className="stat-value" style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stats.pending}
          </span>
          <span className="stat-label">Pending Review</span>
        </div>
        <div className="stat-item">
          <span className="stat-value" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stats.processing}
          </span>
          <span className="stat-label">Processing</span>
        </div>
        <button
          className="btn-add-app"
          onClick={() => setShowNewApp(true)}
        >
          <FiFileText style={{ marginRight: 6 }} /> Add Application
        </button>
      </div>

      {showNewApp && (
        <div className="new-app-panel">
          <div className="new-app-header">
            <FiFileText style={{ marginRight: 8 }} /> Add New Application
          </div>
          <div className="new-app-form">
            <input className="new-app-input" type="text" placeholder="Application Name" value={newAppMeta.name}
              onChange={(e) => setNewAppMeta({ ...newAppMeta, name: e.target.value })} />
            <input className="new-app-input" type="text" placeholder="Vendor / Company" value={newAppMeta.vendor}
              onChange={(e) => setNewAppMeta({ ...newAppMeta, vendor: e.target.value })} />
            <input className="new-app-input" type="text" placeholder="Version (e.g. 1.0.0)" value={newAppMeta.version}
              onChange={(e) => setNewAppMeta({ ...newAppMeta, version: e.target.value })} />
            <input className="new-app-input" type="text" placeholder="Short Description" value={newAppMeta.description}
              onChange={(e) => setNewAppMeta({ ...newAppMeta, description: e.target.value })} />
            <label className="new-app-file-label">
              <input type="file" multiple onChange={(e) => setNewAppFiles(Array.from(e.target.files || []))} style={{ display: 'none' }} />
              <span className="new-app-file-button"><FiFolder style={{ marginRight: 6 }} /> {newAppFiles.length > 0 ? `${newAppFiles.length} file(s) selected` : 'Choose Files'}</span>
            </label>
            <div className="new-app-actions">
              <button type="button" className="btn-primary" disabled={isSubmitting || newAppFiles.length === 0 || !newAppMeta.name}
                onClick={handleCreateAndEvaluate}>{isSubmitting ? 'Submitting...' : 'Create & Evaluate'}</button>
              <button type="button" className="btn-secondary" onClick={handleCancelNewApp}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Applications Grid */}
      <div className="applications-grid">
        {applications.map((app, idx) => (
          <div
            key={app.id}
            className={`app-card ${selectedApp?.id === app.id ? 'selected' : ''}`}
            style={{ position: 'relative', zIndex: 1 }}
            onClick={() => setSelectedApp(app)}
          >
            <div className="app-card-header">
              {(() => {
                const logoUrl = getLogoForCompany(app.applicationData?.companyName);
                const logoFailed = logoLoadError[app.id];
                const fallbackInitial = (app.applicationData?.companyName?.charAt(0) || '💼').toUpperCase();
                return (
                  <div className="app-icon">
                    {logoUrl && !logoFailed ? (
                      <img
                        src={logoUrl}
                        alt={app.applicationData?.companyName || 'logo'}
                        className="app-logo"
                        onError={() => setLogoLoadError((prev) => ({ ...prev, [app.id]: true }))}
                      />
                    ) : (
                      <span className="app-logo-fallback">{fallbackInitial}</span>
                    )}
                  </div>
                );
              })()}
              <div className="app-info">
                <h3 className="app-title">{app.applicationData?.companyName || 'Untitled Application'}</h3>
                <p className="app-company">{app.applicationData?.appName || 'Application Platform'}</p>
                <p className="app-id">{app.id}</p>
              </div>
              <span className="status-badge pending" style={{filter: 'saturate(0.9) brightness(0.9)'}}>
                <FiClock /> {app.status}
              </span>
            </div>

            <div className="app-metrics">
              <div className="metric">
                <span className="metric-value">{app.applicationData?.teamSize || 0}</span>
                <span className="metric-label">Team Size</span>
              </div>
              <div className="metric">
                <span className="metric-value">{app.applicationData?.aiCapabilities?.length || 0}</span>
                <span className="metric-label">AI Features</span>
              </div>
              <div className="metric">
                <span className="metric-value">
                  ${((app.applicationData?.financialProjections?.year1Revenue || 0) / 1000000).toFixed(1)}M
                </span>
                <span className="metric-label">Year 1 Rev</span>
              </div>
            </div>

            {/* Document Summary Section - Always Visible */}
            <div className="app-documents-summary" style={{ 
              background: 'rgba(0,0,0,0.3)', 
              borderRadius: '10px', 
              padding: '12px', 
              border: '1px solid rgba(255,255,255,0.08)',
              marginTop: 'var(--space-sm)'
            }}>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedApp(app);
                  setShowDocsPreview(prev => prev === app.id ? null : app.id);
                }}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <div style={{ 
                  width: '36px', height: '36px', 
                  borderRadius: '8px', 
                  background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FiFolder size={18} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {app.documents?.length || 0} Documents
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Click to view categories
                  </div>
                </div>
                <FiChevronDown size={16} style={{ color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: showDocsPreview === app.id ? 'rotate(180deg)' : 'rotate(0)' }} />
              </div>

              {/* Quick Category Preview - Always visible */}
              {(() => {
                const docs = app.documents || [];
                // Smarter counting that avoids overlap
                const getPVARACount = () => docs.filter(d => {
                  const l = d.toLowerCase();
                  return l.includes('ordinance') || l.includes('moit') || l === 'aml.pdf' ||
                         l.includes('secp') || l.includes('sbp');
                }).length;
                const getNOCFormsCount = () => docs.filter(d => {
                  const l = d.toLowerCase();
                  return (l.includes('form a1') || l.includes('form a2') || l.includes('form a5') ||
                          l.includes('outsourcing declaration')) && !l.includes('a3');
                }).length;
                const getPersonnelCount = () => docs.filter(d => {
                  const l = d.toLowerCase();
                  return l.includes('form a3') || l.includes('a3 forms') || l.includes('a3-') ||
                         l.match(/chen ling|jimmy su|kaiser|richard teng|wilson|heidi|ryan|sunny|ying pok/);
                }).length;
                const getComplianceCount = () => docs.filter(d => {
                  const l = d.toLowerCase();
                  return (l.includes('aml') || l.includes('kyc') || l.includes('kyb') || l.includes('compliance') || 
                          l.includes('sanctions') || l.includes('edd')) && 
                         l !== 'aml.pdf' && !l.includes('secp') && !l.includes('sbp');
                }).length;
                
                const categories = [
                  { label: 'PVARA/Regs', count: getPVARACount(), color: '#dc2626', icon: '📜' },
                  { label: 'NOC Forms', count: getNOCFormsCount(), color: '#2563eb', icon: '📋' },
                  { label: 'Personnel', count: getPersonnelCount(), color: '#be185d', icon: '👤' },
                  { label: 'Compliance', count: getComplianceCount(), color: '#059669', icon: '✅' },
                ].filter(c => c.count > 0);

                return (
                  <div style={{ 
                    display: 'flex', 
                    gap: '6px', 
                    marginTop: '10px', 
                    flexWrap: 'wrap'
                  }}>
                    {categories.map((cat, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        background: `${cat.color}22`,
                        borderRadius: '6px',
                        border: `1px solid ${cat.color}44`,
                        fontSize: '0.7rem'
                      }}>
                        <span>{cat.icon}</span>
                        <span style={{ color: cat.color, fontWeight: 600 }}>{cat.count}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{cat.label}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Documents Preview Dropdown */}
            {showDocsPreview === app.id && app.documents && app.documents.length > 0 && (
              <div 
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '8px',
                  padding: 'var(--space-sm)',
                  marginTop: 'var(--space-sm)',
                  maxHeight: '250px',
                  overflowY: 'auto',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Categorized Document List */}
                {(() => {
                  const docs = app.documents || [];
                  const categorize = (doc: string) => {
                    const lower = doc.toLowerCase();
                    // PVARA Regulations & Ordinance (NOT applicant policies)
                    if (lower.includes('ordinance') || lower.includes('moit') || lower.includes('pvara') ||
                        (lower === 'aml.pdf')) return 'PVARA Regulations';
                    // Regulatory Correspondence
                    if (lower.includes('secp') || lower.includes('sbp') || lower.includes('comments on')) return 'Regulatory Correspondence';
                    // NOC Application Forms
                    if (lower.includes('form a1') || lower.includes('form a2') || lower.includes('form a5') || 
                        lower.includes('form_a1') || lower.includes('form_a2') || lower.includes('form_a5') ||
                        lower.includes('application for no objection') || lower.includes('outsourcing declaration')) return 'NOC Application Forms';
                    // Key Personnel (Form A3)
                    if (lower.includes('form a3') || lower.includes('a3 forms') || lower.includes('a3-') ||
                        lower.includes('director') || lower.includes('cfo') || lower.includes('mlro') ||
                        lower.match(/chen ling|jimmy su|kaiser|richard teng|wilson|heidi|ryan|sunny|ying pok/)) return 'Key Personnel';
                    // Corporate Documents
                    if (lower.includes('certificate') || lower.includes('moa') || lower.includes('board') || 
                        lower.includes('incorporation') || lower.includes('apostille')) return 'Corporate Documents';
                    // Applicant Compliance Policies (not PVARA regs)
                    if (lower.includes('aml') || lower.includes('kyc') || lower.includes('kyb') || 
                        lower.includes('compliance') || lower.includes('sanctions') || lower.includes('edd') ||
                        lower.includes('transaction monitoring') || lower.includes('record keeping')) return 'Compliance Policies';
                    if (lower.includes('financial') || lower.includes('statement')) return 'Financial Documents';
                    if (lower.includes('technical') || lower.includes('risk') || lower.includes('outsourcing') ||
                        lower.includes('bcms') || lower.includes('continuity')) return 'Technical Documents';
                    return 'Other Documents';
                  };
                  
                  const grouped: Record<string, string[]> = {};
                  docs.forEach(d => {
                    const cat = categorize(d);
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(d);
                  });
                  
                  const catColors: Record<string, string> = {
                    'PVARA Regulations': '#dc2626',
                    'Regulatory Correspondence': '#4b5563',
                    'NOC Application Forms': '#2563eb',
                    'Key Personnel': '#be185d',
                    'Corporate Documents': '#7c3aed',
                    'Compliance Policies': '#059669',
                    'Financial Documents': '#d97706',
                    'Technical Documents': '#0891b2',
                    'Other Documents': '#6b7280'
                  };
                  
                  return Object.entries(grouped).slice(0, 5).map(([catName, catDocs], catIdx) => (
                    <div key={catIdx} style={{ marginBottom: '10px' }}>
                      <div style={{ 
                        fontSize: '0.7rem', 
                        color: catColors[catName] || '#6b7280', 
                        marginBottom: '4px', 
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ 
                          width: '4px', 
                          height: '12px', 
                          background: catColors[catName], 
                          borderRadius: '2px' 
                        }}></span>
                        {catName} ({catDocs.length})
                      </div>
                      {catDocs.slice(0, 3).map((doc, idx) => {
                        const fileName = doc.split('/').pop() || doc;
                        const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                        return (
                          <div 
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '5px 8px',
                              background: 'rgba(255,255,255,0.03)',
                              borderRadius: '4px',
                              marginBottom: '2px',
                              marginLeft: '10px',
                              fontSize: '0.72rem'
                            }}
                          >
                            <FiFile size={11} style={{ color: catColors[catName], flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: 'var(--text-secondary)' }}>
                              {fileName}
                            </span>
                            <span style={{ 
                              fontSize: '0.55rem', 
                              padding: '1px 4px',
                              background: fileExt === 'pdf' ? '#ef4444' : fileExt === 'docx' ? '#3b82f6' : '#10b981',
                              color: 'white',
                              borderRadius: '3px',
                              textTransform: 'uppercase'
                            }}>
                              {fileExt}
                            </span>
                          </div>
                        );
                      })}
                      {catDocs.length > 3 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginLeft: '18px' }}>
                          +{catDocs.length - 3} more
                        </div>
                      )}
                    </div>
                  ));
                })()}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedApp(app);
                    setActiveView('storage');
                  }}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '10px',
                    fontSize: '0.75rem',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Open Storage & AI Chat →
                </button>
              </div>
            )}

            <div className="app-actions">
              <button 
                className="btn btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedApp(app);
                  evaluateApplication(app.id);
                }}
                disabled={evaluating}
              >
                <FiShield /> {evaluating ? 'Evaluating...' : 'AI Evaluation'}
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedApp(app);
                  setActiveView('noc');
                }}
              >
                <FiFileText /> NOC
              </button>
            </div>

            {app.applicationData?.applicationDate && (
              <div style={{ marginTop: 'var(--space-md)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', pointerEvents: 'none' }}>
                <FiClock size={12} />
                Submitted {new Date(app.applicationData.applicationDate).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettingsView = () => (
    <div style={{ padding: 'var(--space-2xl)', maxWidth: '800px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: 'var(--space-xl)' }}>Settings</h2>
      <div style={{ background: 'var(--glass-bg)', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Application settings and preferences will appear here.</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside 
        style={{
          width: sidebarOpen ? '280px' : '80px',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width var(--transition-base)',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Logo */}
        <div style={{ 
          padding: 'var(--space-lg)', 
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          minHeight: '80px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'var(--premium-gradient)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden'
          }}>
            <img 
              src="/pvara-logo.png" 
              alt="PVARA" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '🛡️'; }}
            />
          </div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <h1 style={{ fontSize: '1.125rem', fontWeight: '700', whiteSpace: 'nowrap' }}>PVARA AI</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Licensing Platform</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: 'var(--space-lg)', overflow: 'auto' }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ActiveView)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-md)',
                marginBottom: 'var(--space-sm)',
                background: activeView === item.id ? 'var(--glass-bg)' : 'transparent',
                border: activeView === item.id ? '1px solid var(--glass-border)' : '1px solid transparent',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                fontSize: '0.875rem',
                fontWeight: '500',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (activeView !== item.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeView !== item.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && (
                <>
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  {item.badge !== null && (
                    <span style={{
                      background: 'var(--premium-blue)',
                      color: 'white',
                      fontSize: '0.75rem',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      fontWeight: '600'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div style={{ 
          padding: 'var(--space-lg)', 
          borderTop: '1px solid var(--glass-border)',
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              width: '100%',
              padding: 'var(--space-md)',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              marginBottom: 'var(--space-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)'
            }}
          >
            {sidebarOpen ? <FiX /> : <FiMenu />}
            {sidebarOpen && <span style={{ fontSize: '0.875rem' }}>Collapse</span>}
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                width: '100%',
                padding: 'var(--space-md)',
                background: 'transparent',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                gap: 'var(--space-sm)',
                fontSize: '0.875rem'
              }}
            >
              <FiLogOut />
              {sidebarOpen && <span>Logout</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {/* Top Bar */}
        <header style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--glass-border)',
          padding: 'var(--space-lg) var(--space-2xl)',
          position: 'sticky',
          top: 0,
          zIndex: 5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', textTransform: 'capitalize' }}>
              {activeView.replace('-', ' ')}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {activeView === 'applications' && `Managing ${stats.total} applications`}
              {activeView === 'storage' && 'Document storage and AI-powered chat'}
              {activeView === 'noc' && 'NOC creation and issuance'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <button style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}>
              <FiBell />
            </button>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--premium-gradient)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600'
            }}>
              A
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div style={{ minHeight: 'calc(100vh - 81px)' }}>
          {renderContent()}
        </div>
      </main>

      {/* Evaluation Modal */}
      {showEvalModal && evaluation && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              padding: 'var(--space-xl)',
              maxWidth: '960px',
              gap: 'var(--space-lg)',
              background: 'rgba(18, 23, 38, 0.9)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-primary)',
              lineHeight: 1.6
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: 'var(--space-sm)' }}>
                  🤖 AI Evaluation Report
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>Application ID: {evaluation.applicationId}</p>
                  {(evaluation as any).modelUsed && (
                    <span style={{
                      background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}>
                      {(evaluation as any).modelUsed}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button 
                  type="button"
                  onClick={handleRefreshEvaluation}
                  disabled={evaluating}
                  style={{ 
                    background: 'linear-gradient(135deg, #6366f1, #22d3ee)', 
                    border: 'none',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    cursor: evaluating ? 'wait' : 'pointer',
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: evaluating ? 0.7 : 1
                  }}
                >
                  {evaluating ? '⏳ Evaluating...' : '🔄 Re-evaluate with GPT-5.1'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowEvalModal(false)}
                  style={{ 
                    background: 'var(--glass-bg)', 
                    border: '1px solid var(--glass-border)',
                    padding: 'var(--space-sm)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '1.5rem'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Score Overview */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 'var(--space-lg)',
              marginBottom: 'var(--space-xl)'
            }}>
              <div style={{ 
                background: 'var(--glass-bg)',
                padding: 'var(--space-xl)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--glass-border)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', background: 'var(--premium-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {evaluation.overallScore}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 'var(--space-sm)' }}>Overall Score</div>
              </div>
              
              <div style={{ 
                background: 'var(--glass-bg)',
                padding: 'var(--space-xl)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--glass-border)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: getRiskColor(evaluation.riskLevel) }}>
                  {evaluation.riskLevel.toUpperCase()}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 'var(--space-sm)' }}>Risk Level</div>
              </div>

              <div style={{ 
                background: 'var(--glass-bg)',
                padding: 'var(--space-xl)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--glass-border)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--premium-blue)', textTransform: 'capitalize' }}>
                  {evaluation.recommendation.replace(/-/g, ' ')}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 'var(--space-sm)' }}>Recommendation</div>
              </div>
            </div>

            {/* Detailed Scores */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ marginBottom: 'var(--space-lg)' }}>Detailed Assessment</h3>
              <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                {[
                  { label: 'Compliance', score: evaluation.complianceScore, icon: <FiShield />, category: 'compliance' },
                  { label: 'Technical', score: evaluation.technicalScore, icon: <FiFileText />, category: 'technical' },
                  { label: 'Business', score: evaluation.businessScore, icon: <FiTrendingUp />, category: 'business' },
                  { label: 'Regulatory', score: evaluation.regulatoryScore, icon: <FiGlobe />, category: 'regulatory' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      const items = (evaluation.comments || [])
                        .filter((c) => c.category === item.category)
                        .map((c) => `${c.title}: ${c.description}`);
                      setScoreDetail({
                        label: item.label,
                        score: item.score,
                        items: items.length ? items : [`No specific findings recorded. Score reflects automated checks for ${item.label.toLowerCase()}.`]
                      });
                    }}
                    style={{ 
                      background: 'var(--glass-bg)',
                      padding: 'var(--space-lg)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-lg)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', color: 'var(--premium-blue)' }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                        <span style={{ fontWeight: '600' }}>{item.label}</span>
                        <span style={{ fontWeight: '700', color: 'var(--premium-blue)' }}>{item.score}/100</span>
                      </div>
                      <div style={{ 
                        height: '8px', 
                        background: 'rgba(255,255,255,0.1)', 
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          width: `${item.score}%`, 
                          height: '100%', 
                          background: 'var(--premium-gradient)',
                          transition: 'width 1s ease'
                        }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {scoreDetail && (
                <div style={{
                  marginTop: 'var(--space-lg)',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-lg)',
                  display: 'grid',
                  gap: 'var(--space-sm)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0 }}>{scoreDetail.label} Detail</h4>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{scoreDetail.score}/100</span>
                  </div>
                  <ul style={{ paddingLeft: '1rem', margin: 0, display: 'grid', gap: 'var(--space-xs)' }}>
                    {scoreDetail.items.map((item, idx) => (
                      <li key={idx} style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* AI Insights */}
            {evaluation.aiInsights && (
              <div style={{ 
                background: 'var(--glass-bg)',
                padding: 'var(--space-xl)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--glass-border)',
                marginBottom: 'var(--space-xl)',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <FiTrendingUp /> 🤖 AI Regulatory Assessment
                </h3>
                <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.9rem' }}>
                  {evaluation.aiInsights.split('\n').map((line, idx) => {
                    // Style headers (lines starting with # or **)
                    if (line.startsWith('**') || line.startsWith('##') || line.startsWith('# ')) {
                      return <div key={idx} style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{line.replace(/\*\*/g, '').replace(/##/g, '').replace(/# /g, '')}</div>;
                    }
                    // Style bullet points
                    if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
                      return <div key={idx} style={{ paddingLeft: '1rem', marginBottom: '0.25rem' }}>{line}</div>;
                    }
                    // Style numbered items
                    if (/^\d+\./.test(line.trim())) {
                      return <div key={idx} style={{ paddingLeft: '0.5rem', marginBottom: '0.25rem', fontWeight: 500 }}>{line}</div>;
                    }
                    // Emoji headers
                    if (/^[📊🏢⚠️📋📄🌍📝✅❌🇵🇰📈📌🤖🏛️⛔]/.test(line.trim())) {
                      return <div key={idx} style={{ fontWeight: 600, marginTop: '0.75rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{line}</div>;
                    }
                    // Empty lines
                    if (!line.trim()) {
                      return <div key={idx} style={{ height: '0.5rem' }}></div>;
                    }
                    return <div key={idx}>{line}</div>;
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowEvalModal(false)}
              >
                Close
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowEvalModal(false);
                  setActiveView('noc');
                }}
              >
                <FiFileText /> Proceed to NOC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
