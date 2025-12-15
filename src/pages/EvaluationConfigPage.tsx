import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiFolder, FiFile, FiCheck, FiX, FiPlay, FiTag, FiBookOpen, FiFileText, FiClipboard, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { storageApi } from '../services/api';
import { applicationsApi, ComprehensiveEvaluation } from '../services/applications.api';

// Document tag types
type DocumentTag = 'application-form' | 'regulation' | 'supporting' | 'ordinance' | 'none';

interface TaggedDocument {
  name: string;
  tag: DocumentTag;
  selected: boolean;
}

interface RegulatoryChecklist {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  items: string[];
}

interface EvaluationConfigPageProps {
  application: {
    id: string;
    applicationData?: {
      companyName?: string;
      name?: string;
    };
  };
  onBack: () => void;
  onEvaluationComplete: (evaluation: ComprehensiveEvaluation) => void;
}

const DEFAULT_AI_CONTEXT = `You are a PVARA (Pakistan Virtual Assets Regulatory Authority) Senior Regulatory Auditor evaluating a Virtual Asset Service Provider (VASP) license application.

Your role is to:
1. Review all submitted documents against the regulatory requirements
2. Check compliance with the Virtual Assets (VA) Fit & Proper Requirements
3. Verify SECP prerequisites under the Companies Act 2017
4. Evaluate against NOC (No Objection Certificate) Regulations
5. Assess compliance with Licensing Regulations and Governance Requirements

For each regulatory area, you must:
- List which required documents are PRESENT and satisfactory
- List which required documents are MISSING or incomplete
- Provide specific recommendations for compliance gaps
- Assign a compliance score (0-100%) for each area

Be thorough, specific, and cite the relevant regulation sections where applicable.`;

const REGULATORY_CHECKLISTS: RegulatoryChecklist[] = [
  {
    id: 'noc-regulations',
    name: 'NOC Regulations',
    description: 'No Objection Certificate requirements for VASP operations',
    enabled: true,
    items: [
      'Application Form A1 - Entity Information',
      'Application Form A2 - Business Model Declaration',
      'Application Form A5 - Compliance Declaration',
      'Board Resolution for NOC Application',
      'AML/CFT Policy Document',
      'Risk Assessment Framework',
      'Customer Due Diligence Procedures',
      'Transaction Monitoring System Details',
    ]
  },
  {
    id: 'va-fit-proper',
    name: 'VA Fit & Proper Requirements',
    description: 'Fitness and propriety requirements for key personnel',
    enabled: true,
    items: [
      'Form A3 - Key Personnel Information (all directors/shareholders)',
      'Educational Qualifications of Key Personnel',
      'Professional Experience Certificates',
      'Criminal Background Checks',
      'Financial Integrity Declarations',
      'Conflict of Interest Disclosures',
      'Source of Funds Documentation',
      'Reference Letters from Financial Institutions',
    ]
  },
  {
    id: 'secp-prerequisites',
    name: 'SECP Prerequisites (Companies Act 2017)',
    description: 'Securities and Exchange Commission of Pakistan requirements',
    enabled: true,
    items: [
      'Certificate of Incorporation',
      'Memorandum of Association',
      'Articles of Association',
      'Form 29 - Registered Office Address',
      'Form A - Company Registration Details',
      'Latest Annual Returns',
      'Audited Financial Statements (3 years)',
      'Tax Registration Certificate (NTN)',
      'Company Secretary Appointment',
    ]
  },
  {
    id: 'licensing-regulations',
    name: 'Licensing Regulations & Governance',
    description: 'VASP licensing and corporate governance requirements',
    enabled: true,
    items: [
      'Business Plan (3-5 years)',
      'Organizational Structure Chart',
      'IT Security Policy',
      'Data Protection Policy',
      'Business Continuity Plan',
      'Disaster Recovery Procedures',
      'Internal Audit Framework',
      'Compliance Officer Appointment',
      'Regulatory Capital Requirements Evidence',
      'Insurance/Indemnity Coverage',
    ]
  }
];

const TAG_COLORS: Record<DocumentTag, { bg: string; color: string; label: string; icon: React.ReactNode }> = {
  'application-form': { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', label: 'Application Form', icon: <FiClipboard size={12} /> },
  'regulation': { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', label: 'Regulation', icon: <FiBookOpen size={12} /> },
  'supporting': { bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', label: 'Supporting Doc', icon: <FiFileText size={12} /> },
  'ordinance': { bg: 'rgba(168, 85, 247, 0.2)', color: '#a855f7', label: 'Ordinance', icon: <FiFile size={12} /> },
  'none': { bg: 'rgba(100, 116, 139, 0.2)', color: '#64748b', label: 'Untagged', icon: <FiTag size={12} /> },
};

const EvaluationConfigPage: React.FC<EvaluationConfigPageProps> = ({ application, onBack, onEvaluationComplete }) => {
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [filesInFolder, setFilesInFolder] = useState<string[]>([]);
  const [taggedDocuments, setTaggedDocuments] = useState<TaggedDocument[]>([]);
  const [checklists, setChecklists] = useState<RegulatoryChecklist[]>(REGULATORY_CHECKLISTS);
  const [aiContext, setAiContext] = useState(DEFAULT_AI_CONTEXT);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<ComprehensiveEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'checklists' | 'context' | 'results'>('documents');

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, []);

  // Load files when folder changes
  useEffect(() => {
    if (selectedFolder) {
      loadFiles(selectedFolder);
    }
  }, [selectedFolder]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const { data } = await storageApi.listFolders();
      setFolders(data.folders || []);
      // Auto-select folder matching application id if exists
      if (data.folders?.includes(application.id)) {
        setSelectedFolder(application.id);
      }
    } catch (err) {
      console.error('Error loading folders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (folder: string) => {
    try {
      setLoading(true);
      const { data } = await storageApi.listFiles(folder);
      setFilesInFolder(data.files || []);
      // Initialize tagged documents
      setTaggedDocuments((data.files || []).map((name: string) => ({
        name,
        tag: guessDocumentTag(name),
        selected: true // Default all selected
      })));
    } catch (err) {
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  };

  // Smart tag guessing based on filename
  const guessDocumentTag = (fileName: string): DocumentTag => {
    const lower = fileName.toLowerCase();
    if (lower.includes('form a1') || lower.includes('form a2') || lower.includes('form a3') || lower.includes('form a5') || lower.includes('application')) {
      return 'application-form';
    }
    if (lower.includes('ordinance') || lower.includes('pvara') || lower.includes('moit')) {
      return 'ordinance';
    }
    if (lower.includes('regulation') || lower.includes('secp') || lower.includes('sbp') || lower.includes('aml') || lower.includes('kyc')) {
      return 'regulation';
    }
    return 'supporting';
  };

  const toggleDocumentSelection = (docName: string) => {
    setTaggedDocuments(prev => prev.map(doc => 
      doc.name === docName ? { ...doc, selected: !doc.selected } : doc
    ));
  };

  const updateDocumentTag = (docName: string, tag: DocumentTag) => {
    setTaggedDocuments(prev => prev.map(doc => 
      doc.name === docName ? { ...doc, tag } : doc
    ));
  };

  const toggleChecklist = (checklistId: string) => {
    setChecklists(prev => prev.map(cl => 
      cl.id === checklistId ? { ...cl, enabled: !cl.enabled } : cl
    ));
  };

  const getSelectedDocumentsByTag = () => {
    const selected = taggedDocuments.filter(d => d.selected);
    return {
      applicationForms: selected.filter(d => d.tag === 'application-form').map(d => d.name),
      regulations: selected.filter(d => d.tag === 'regulation').map(d => d.name),
      supporting: selected.filter(d => d.tag === 'supporting').map(d => d.name),
      ordinances: selected.filter(d => d.tag === 'ordinance').map(d => d.name),
    };
  };

  const runEvaluation = async () => {
    if (!selectedFolder) {
      setError('Please select a folder first');
      return;
    }

    const selectedDocs = taggedDocuments.filter(d => d.selected);
    if (selectedDocs.length === 0) {
      setError('Please select at least one document');
      return;
    }

    try {
      setEvaluating(true);
      setError(null);
      setActiveTab('results');

      const enabledChecklists = checklists.filter(cl => cl.enabled);
      const docsByTag = getSelectedDocumentsByTag();

      // Build the evaluation request
      const evaluationConfig = {
        applicationId: application.id,
        folder: selectedFolder,
        documents: selectedDocs.map(d => ({ name: d.name, tag: d.tag })),
        documentsByTag: docsByTag,
        checklists: enabledChecklists.map(cl => ({ id: cl.id, name: cl.name, items: cl.items })),
        aiContext: aiContext,
        companyName: application.applicationData?.companyName || application.id,
      };

      console.log('📋 Evaluation Config:', evaluationConfig);

      // Call the new configured evaluation endpoint
      const result = await applicationsApi.evaluateWithConfig(evaluationConfig);
      setEvaluation(result.evaluation);
      onEvaluationComplete(result.evaluation);

    } catch (err: any) {
      console.error('Evaluation error:', err);
      setError(err.response?.data?.error || 'Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  const selectedCount = taggedDocuments.filter(d => d.selected).length;
  const enabledChecklistCount = checklists.filter(cl => cl.enabled).length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ 
        padding: '20px 24px', 
        borderBottom: '1px solid var(--glass-border)', 
        background: 'var(--glass-bg)',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiArrowLeft size={20} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4 }}>
            🔍 Configure AI Evaluation
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {application.applicationData?.companyName || application.id}
          </p>
        </div>
        <button 
          onClick={runEvaluation} 
          disabled={evaluating || selectedCount === 0}
          style={{ 
            background: evaluating ? 'var(--glass-bg)' : 'linear-gradient(135deg, #22c55e, #16a34a)', 
            border: 'none', 
            borderRadius: 8, 
            padding: '12px 24px', 
            color: 'white', 
            cursor: evaluating || selectedCount === 0 ? 'not-allowed' : 'pointer', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: selectedCount === 0 ? 0.5 : 1
          }}
        >
          <FiPlay /> {evaluating ? 'Evaluating...' : 'Run AI Evaluation'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ margin: '16px 24px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiAlertCircle /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><FiX /></button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--glass-border)', padding: '0 24px' }}>
        {[
          { id: 'documents', label: '📁 Documents', badge: `${selectedCount} selected` },
          { id: 'checklists', label: '📋 Regulatory Checklists', badge: `${enabledChecklistCount} active` },
          { id: 'context', label: '🤖 AI Context', badge: null },
          { id: 'results', label: '📊 Results', badge: evaluation ? '✓' : null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #22d3ee' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.9rem'
            }}
          >
            {tab.label}
            {tab.badge && (
              <span style={{ background: 'rgba(34, 211, 238, 0.2)', color: '#22d3ee', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem' }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {activeTab === 'documents' && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, height: '100%' }}>
            {/* Folder Selection */}
            <div style={{ background: 'var(--glass-bg)', borderRadius: 12, padding: 20, border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiFolder /> Select Folder
              </h3>
              {loading && <div style={{ color: 'var(--text-secondary)' }}>Loading folders...</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {folders.map(folder => (
                  <button
                    key={folder}
                    onClick={() => setSelectedFolder(folder)}
                    style={{
                      padding: '12px 16px',
                      background: selectedFolder === folder ? 'linear-gradient(135deg, #0f766e, #0d9488)' : 'rgba(0,0,0,0.2)',
                      border: selectedFolder === folder ? '1px solid #22d3ee' : '1px solid var(--glass-border)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <FiFolder /> {folder}
                    {selectedFolder === folder && <FiCheck style={{ marginLeft: 'auto', color: '#22d3ee' }} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Selection with Tags */}
            <div style={{ background: 'var(--glass-bg)', borderRadius: 12, padding: 20, border: '1px solid var(--glass-border)', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiFile /> Select & Tag Documents
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setTaggedDocuments(prev => prev.map(d => ({ ...d, selected: true })))} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '6px 12px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem' }}>Select All</button>
                  <button onClick={() => setTaggedDocuments(prev => prev.map(d => ({ ...d, selected: false })))} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '6px 12px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem' }}>Deselect All</button>
                </div>
              </div>

              {/* Tag Legend */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                {Object.entries(TAG_COLORS).filter(([key]) => key !== 'none').map(([key, style]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, background: style.bg, padding: '4px 10px', borderRadius: 12, fontSize: '0.75rem', color: style.color }}>
                    {style.icon} {style.label}
                  </div>
                ))}
              </div>

              {!selectedFolder ? (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 40 }}>
                  ← Select a folder to view documents
                </div>
              ) : taggedDocuments.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 40 }}>
                  No documents in this folder
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {taggedDocuments.map(doc => {
                    const tagStyle = TAG_COLORS[doc.tag];
                    return (
                      <div
                        key={doc.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 16px',
                          background: doc.selected ? 'rgba(34, 211, 238, 0.1)' : 'rgba(0,0,0,0.2)',
                          border: doc.selected ? '1px solid rgba(34, 211, 238, 0.3)' : '1px solid var(--glass-border)',
                          borderRadius: 8
                        }}
                      >
                        <button
                          onClick={() => toggleDocumentSelection(doc.name)}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            background: doc.selected ? '#22c55e' : 'transparent',
                            border: doc.selected ? 'none' : '2px solid var(--glass-border)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {doc.selected && <FiCheck size={14} />}
                        </button>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                        </div>
                        <select
                          value={doc.tag}
                          onChange={(e) => updateDocumentTag(doc.name, e.target.value as DocumentTag)}
                          style={{
                            background: tagStyle.bg,
                            border: `1px solid ${tagStyle.color}`,
                            borderRadius: 6,
                            padding: '6px 10px',
                            color: tagStyle.color,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 500
                          }}
                        >
                          <option value="application-form">📋 Application Form</option>
                          <option value="regulation">📖 Regulation</option>
                          <option value="supporting">📄 Supporting Doc</option>
                          <option value="ordinance">📜 Ordinance</option>
                          <option value="none">🏷️ Untagged</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'checklists' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
            {checklists.map(checklist => (
              <div
                key={checklist.id}
                style={{
                  background: checklist.enabled ? 'var(--glass-bg)' : 'rgba(0,0,0,0.2)',
                  borderRadius: 12,
                  padding: 20,
                  border: checklist.enabled ? '1px solid rgba(34, 211, 238, 0.3)' : '1px solid var(--glass-border)',
                  opacity: checklist.enabled ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>{checklist.name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{checklist.description}</p>
                  </div>
                  <button
                    onClick={() => toggleChecklist(checklist.id)}
                    style={{
                      width: 48,
                      height: 26,
                      borderRadius: 13,
                      background: checklist.enabled ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(100, 116, 139, 0.3)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: 3,
                      left: checklist.enabled ? 25 : 3,
                      transition: 'left 0.2s'
                    }} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {checklist.items.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: checklist.enabled ? '#22d3ee' : '#64748b' }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'context' && (
          <div style={{ background: 'var(--glass-bg)', borderRadius: 12, padding: 24, border: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>🤖 AI Evaluation Context & Prompt</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Customize the instructions for the AI evaluator. This context will guide how the AI analyzes the documents.
            </p>
            <textarea
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              style={{
                width: '100%',
                minHeight: 400,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--glass-border)',
                borderRadius: 8,
                padding: 16,
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
            />
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button
                onClick={() => setAiContext(DEFAULT_AI_CONTEXT)}
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '8px 16px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Reset to Default
              </button>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div>
            {evaluating ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div className="loading-spinner" style={{ margin: '0 auto 20px', width: 48, height: 48 }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>🔍 AI Evaluation in Progress...</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Analyzing {selectedCount} documents against {enabledChecklistCount} regulatory checklists</p>
              </div>
            ) : evaluation ? (
              <div>
                {/* Evaluation Results Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                  <div style={{ background: 'var(--glass-bg)', borderRadius: 12, padding: 20, border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, background: 'linear-gradient(135deg, #22d3ee, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {evaluation.overallScore}%
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Overall Score</div>
                  </div>
                  <div style={{ background: 'var(--glass-bg)', borderRadius: 12, padding: 20, border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: evaluation.riskLevel === 'low' ? '#22c55e' : evaluation.riskLevel === 'medium' ? '#f59e0b' : '#ef4444' }}>
                      {evaluation.riskLevel?.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Risk Level</div>
                  </div>
                  <div style={{ background: 'var(--glass-bg)', borderRadius: 12, padding: 20, border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                      {evaluation.recommendation === 'approve' ? '✅ Approve' : 
                       evaluation.recommendation === 'conditional-approval' ? '⚠️ Conditional' :
                       evaluation.recommendation === 'reject' ? '❌ Reject' : '🔍 Review'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Recommendation</div>
                  </div>
                </div>

                {/* AI Insights */}
                <div style={{ background: 'var(--glass-bg)', borderRadius: 12, padding: 24, border: '1px solid var(--glass-border)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>📋 Detailed AI Assessment</h3>
                  <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    fontSize: '0.9rem', 
                    lineHeight: 1.7, 
                    color: 'var(--text-primary)',
                    background: 'rgba(0,0,0,0.2)',
                    padding: 20,
                    borderRadius: 8,
                    maxHeight: 500,
                    overflow: 'auto'
                  }}>
                    {evaluation.aiInsights || 'No detailed insights available.'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
                <FiClipboard size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>No Evaluation Yet</h3>
                <p>Configure your documents and checklists, then click "Run AI Evaluation"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationConfigPage;
