import React, { useState, useEffect, useRef } from 'react';
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
  const [taggedDocuments, setTaggedDocuments] = useState<TaggedDocument[]>([]);
  const [checklists, setChecklists] = useState<RegulatoryChecklist[]>(REGULATORY_CHECKLISTS);
  const [aiContext, setAiContext] = useState(DEFAULT_AI_CONTEXT);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<ComprehensiveEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'checklists' | 'context' | 'preview' | 'results'>('documents');
  const contentRef = useRef<HTMLDivElement>(null);

  // Load folders on mount
  useEffect(() => {
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
    loadFolders();
  }, [application.id]);

  // Load files when folder changes
  useEffect(() => {
    const loadFiles = async (folder: string) => {
      try {
        setLoading(true);
        const { data } = await storageApi.listFiles(folder);
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
    
    if (selectedFolder) {
      loadFiles(selectedFolder);
    }
  }, [selectedFolder]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

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
  
  // Get counts by tag for summary
  const tagCounts = {
    'application-form': taggedDocuments.filter(d => d.selected && d.tag === 'application-form').length,
    'regulation': taggedDocuments.filter(d => d.selected && d.tag === 'regulation').length,
    'supporting': taggedDocuments.filter(d => d.selected && d.tag === 'supporting').length,
    'ordinance': taggedDocuments.filter(d => d.selected && d.tag === 'ordinance').length,
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #0a0f1c 0%, #1a1f2e 100%)' }}>
      {/* Header */}
      <div style={{ 
        padding: '20px 32px', 
        borderBottom: '1px solid rgba(255,255,255,0.1)', 
        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(99, 102, 241, 0.1))',
        display: 'flex',
        alignItems: 'center',
        gap: 20
      }}>
        <button onClick={onBack} style={{ 
          background: 'rgba(255,255,255,0.1)', 
          border: '1px solid rgba(255,255,255,0.2)', 
          color: 'var(--text-primary)', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8,
          padding: '10px 16px',
          borderRadius: 8,
          fontWeight: 500,
          transition: 'all 0.2s'
        }}>
          <FiArrowLeft size={18} /> Back to Applications
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-primary)' }}>
            <span style={{ fontSize: '1.8rem' }}>🔍</span> Configure AI Regulatory Evaluation
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'linear-gradient(135deg, #22d3ee, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 600 }}>
              {application.applicationData?.companyName || application.id}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
            Select documents, tag them, and configure regulatory checklists for AI evaluation
          </p>
        </div>
      </div>

      {/* Summary Bar */}
      <div style={{
        display: 'flex',
        gap: 16,
        padding: '16px 32px',
        background: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiClipboard color="#3b82f6" />
            <span style={{ color: '#3b82f6', fontWeight: 600 }}>{tagCounts['application-form']}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Forms</span>
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiBookOpen color="#ef4444" />
            <span style={{ color: '#ef4444', fontWeight: 600 }}>{tagCounts['regulation']}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Regulations</span>
          </div>
          <div style={{ background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiFile color="#a855f7" />
            <span style={{ color: '#a855f7', fontWeight: 600 }}>{tagCounts['ordinance']}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ordinances</span>
          </div>
          <div style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiFileText color="#22c55e" />
            <span style={{ color: '#22c55e', fontWeight: 600 }}>{tagCounts['supporting']}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Supporting</span>
          </div>
        </div>
        
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ready to review</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedCount} documents • {enabledChecklistCount} checklists
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setActiveTab('preview')} 
            disabled={selectedCount === 0}
            style={{ 
              background: selectedCount === 0 ? 'rgba(100,100,100,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
              border: 'none', 
              borderRadius: 12, 
              padding: '14px 28px', 
              color: 'white', 
              cursor: selectedCount === 0 ? 'not-allowed' : 'pointer', 
              fontWeight: 700,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: selectedCount === 0 ? 0.5 : 1,
              boxShadow: selectedCount > 0 ? '0 4px 20px rgba(99, 102, 241, 0.4)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            👁️ Review & Evaluate
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ margin: '16px 24px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiAlertCircle /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><FiX /></button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 32px', background: 'rgba(0,0,0,0.2)' }}>
        {[
          { id: 'documents', label: '📁 Documents', badge: `${selectedCount}`, desc: 'Select & tag' },
          { id: 'checklists', label: '📋 Checklists', badge: `${enabledChecklistCount}`, desc: 'Regulatory' },
          { id: 'context', label: '🤖 AI Context', badge: null, desc: 'Prompt' },
          { id: 'preview', label: '👁️ Review', badge: selectedCount > 0 ? '→' : null, desc: 'Preview' },
          { id: 'results', label: '📊 Results', badge: evaluation ? '✓' : null, desc: 'Assessment' },
        ].map(tab => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '16px 24px',
              background: activeTab === tab.id ? 'rgba(34, 211, 238, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #22d3ee' : '3px solid transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: '0.95rem',
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.2s'
            }}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span style={{ 
                background: activeTab === tab.id ? 'linear-gradient(135deg, #22d3ee, #6366f1)' : 'rgba(100,100,100,0.3)', 
                color: 'white', 
                padding: '3px 10px', 
                borderRadius: 20, 
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div ref={contentRef} style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        {activeTab === 'documents' && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, height: '100%' }}>
            {/* Folder Selection */}
            <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#22d3ee' }}>
                <FiFolder size={20} /> Select Source Folder
              </h3>
              {loading && <div style={{ color: 'var(--text-secondary)', padding: 20, textAlign: 'center' }}>Loading folders...</div>}
              {folders.length === 0 && !loading && (
                <div style={{ color: 'var(--text-secondary)', padding: 20, textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                  No folders found in storage
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {folders.map(folder => (
                  <button
                    key={folder}
                    onClick={() => setSelectedFolder(folder)}
                    style={{
                      padding: '14px 18px',
                      background: selectedFolder === folder ? 'linear-gradient(135deg, #0f766e, #0d9488)' : 'rgba(0,0,0,0.3)',
                      border: selectedFolder === folder ? '2px solid #22d3ee' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontWeight: selectedFolder === folder ? 600 : 400,
                      transition: 'all 0.2s',
                      boxShadow: selectedFolder === folder ? '0 4px 15px rgba(34, 211, 238, 0.2)' : 'none'
                    }}
                  >
                    <FiFolder size={18} color={selectedFolder === folder ? '#22d3ee' : '#64748b'} /> 
                    <span style={{ flex: 1 }}>{folder}</span>
                    {selectedFolder === folder && <FiCheckCircle color="#22d3ee" size={18} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Selection with Tags */}
            <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)', overflow: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, color: '#22d3ee' }}>
                  <FiFile size={20} /> Select & Tag Documents
                </h3>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setTaggedDocuments(prev => prev.map(d => ({ ...d, selected: true })))} style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: 8, padding: '8px 14px', color: '#22c55e', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>✓ Select All</button>
                  <button onClick={() => setTaggedDocuments(prev => prev.map(d => ({ ...d, selected: false })))} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 8, padding: '8px 14px', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>✕ Deselect All</button>
                </div>
              </div>

              {/* Tag Legend */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginRight: 8 }}>Tag Legend:</span>
                {Object.entries(TAG_COLORS).filter(([key]) => key !== 'none').map(([key, style]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, background: style.bg, padding: '5px 12px', borderRadius: 20, fontSize: '0.8rem', color: style.color, fontWeight: 500 }}>
                    {style.icon} {style.label}
                  </div>
                ))}
              </div>

              {!selectedFolder ? (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 60, background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '2px dashed rgba(255,255,255,0.1)' }}>
                  <FiFolder size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                  <div style={{ fontSize: '1.1rem', marginBottom: 8 }}>Select a folder to view documents</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Choose from the folder list on the left</div>
                </div>
              ) : taggedDocuments.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 60, background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '2px dashed rgba(255,255,255,0.1)' }}>
                  <FiFile size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                  <div style={{ fontSize: '1.1rem', marginBottom: 8 }}>No documents in this folder</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Upload documents to the storage first</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {taggedDocuments.map(doc => {
                    const tagStyle = TAG_COLORS[doc.tag];
                    return (
                      <div
                        key={doc.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '14px 18px',
                          background: doc.selected ? 'rgba(34, 211, 238, 0.1)' : 'rgba(0,0,0,0.2)',
                          border: doc.selected ? '2px solid rgba(34, 211, 238, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          transition: 'all 0.2s',
                          boxShadow: doc.selected ? '0 2px 10px rgba(34, 211, 238, 0.1)' : 'none'
                        }}
                      >
                        <button
                          onClick={() => toggleDocumentSelection(doc.name)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: doc.selected ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'transparent',
                            border: doc.selected ? 'none' : '2px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: doc.selected ? '0 2px 8px rgba(34, 197, 94, 0.3)' : 'none'
                          }}
                        >
                          {doc.selected && <FiCheck size={16} />}
                        </button>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: doc.selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{doc.name}</div>
                        </div>
                        <select
                          value={doc.tag}
                          onChange={(e) => updateDocumentTag(doc.name, e.target.value as DocumentTag)}
                          style={{
                            background: '#1e293b',
                            border: `2px solid ${tagStyle.color}`,
                            borderRadius: 8,
                            padding: '8px 14px',
                            color: tagStyle.color,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            minWidth: 160,
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            paddingRight: '36px'
                          }}
                        >
                          <option value="application-form" style={{ background: '#1e293b', color: '#3b82f6' }}>📋 Application Form</option>
                          <option value="regulation" style={{ background: '#1e293b', color: '#ef4444' }}>📖 Regulation</option>
                          <option value="supporting" style={{ background: '#1e293b', color: '#22c55e' }}>📄 Supporting Doc</option>
                          <option value="ordinance" style={{ background: '#1e293b', color: '#a855f7' }}>📜 Ordinance</option>
                          <option value="none" style={{ background: '#1e293b', color: '#64748b' }}>🏷️ Untagged</option>
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
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8, color: '#22d3ee' }}>📋 Regulatory Checklists</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Enable the regulatory frameworks to evaluate against. The AI will check if documents satisfy each requirement.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
              {checklists.map(checklist => (
                <div
                  key={checklist.id}
                  style={{
                    background: checklist.enabled 
                      ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))' 
                      : 'rgba(0,0,0,0.2)',
                    borderRadius: 16,
                    padding: 24,
                    border: checklist.enabled ? '2px solid rgba(34, 211, 238, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                    opacity: checklist.enabled ? 1 : 0.6,
                    transition: 'all 0.3s',
                    boxShadow: checklist.enabled ? '0 4px 20px rgba(0,0,0,0.3)' : 'none'
                  }}
                >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 6, color: checklist.enabled ? '#e2e8f0' : '#94a3b8' }}>{checklist.name}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{checklist.description}</p>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
                  {checklist.items.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '0.85rem', color: checklist.enabled ? '#cbd5e1' : '#64748b', display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: checklist.enabled ? '#22d3ee' : '#475569', marginTop: 5, flexShrink: 0 }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            </div>
          </div>
        )}

        {activeTab === 'context' && (
          <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', borderRadius: 16, padding: 28, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8, color: '#22d3ee' }}>🤖 AI Evaluation Context & Prompt</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Customize the instructions for the AI evaluator. This context will guide how the AI analyzes the documents and generates the assessment.
            </p>
            <textarea
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              style={{
                width: '100%',
                minHeight: 450,
                background: 'rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 20,
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                lineHeight: 1.7,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                resize: 'vertical'
              }}
            />
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button
                onClick={() => setAiContext(DEFAULT_AI_CONTEXT)}
                style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 8, padding: '10px 20px', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
              >
                🔄 Reset to Default
              </button>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div style={{ maxWidth: 1000 }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                👁️ Review Evaluation Configuration
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Review all selected documents and settings before running the AI evaluation
              </p>
            </div>

            {/* Selected Documents by Tag */}
            <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16, color: '#22d3ee', display: 'flex', alignItems: 'center', gap: 10 }}>
                <FiFile size={18} /> Selected Documents ({selectedCount})
              </h3>
              
              {/* Application Forms */}
              {taggedDocuments.filter(d => d.selected && d.tag === 'application-form').length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: TAG_COLORS['application-form'].bg, color: TAG_COLORS['application-form'].color, padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {TAG_COLORS['application-form'].icon} Application Forms
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>({taggedDocuments.filter(d => d.selected && d.tag === 'application-form').length} files)</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 16 }}>
                    {taggedDocuments.filter(d => d.selected && d.tag === 'application-form').map(doc => (
                      <div key={doc.name} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        <FiCheckCircle size={14} color="#22c55e" />
                        {doc.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regulations */}
              {taggedDocuments.filter(d => d.selected && d.tag === 'regulation').length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: TAG_COLORS['regulation'].bg, color: TAG_COLORS['regulation'].color, padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {TAG_COLORS['regulation'].icon} Regulations
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>({taggedDocuments.filter(d => d.selected && d.tag === 'regulation').length} files)</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 16 }}>
                    {taggedDocuments.filter(d => d.selected && d.tag === 'regulation').map(doc => (
                      <div key={doc.name} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        <FiCheckCircle size={14} color="#22c55e" />
                        {doc.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ordinances */}
              {taggedDocuments.filter(d => d.selected && d.tag === 'ordinance').length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: TAG_COLORS['ordinance'].bg, color: TAG_COLORS['ordinance'].color, padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {TAG_COLORS['ordinance'].icon} Ordinances
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>({taggedDocuments.filter(d => d.selected && d.tag === 'ordinance').length} files)</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 16 }}>
                    {taggedDocuments.filter(d => d.selected && d.tag === 'ordinance').map(doc => (
                      <div key={doc.name} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        <FiCheckCircle size={14} color="#22c55e" />
                        {doc.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supporting Docs */}
              {taggedDocuments.filter(d => d.selected && d.tag === 'supporting').length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: TAG_COLORS['supporting'].bg, color: TAG_COLORS['supporting'].color, padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {TAG_COLORS['supporting'].icon} Supporting Documents
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>({taggedDocuments.filter(d => d.selected && d.tag === 'supporting').length} files)</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 16 }}>
                    {taggedDocuments.filter(d => d.selected && d.tag === 'supporting').map(doc => (
                      <div key={doc.name} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        <FiCheckCircle size={14} color="#22c55e" />
                        {doc.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCount === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                  <FiAlertCircle size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <p>No documents selected. Go to the Documents tab to select files.</p>
                </div>
              )}
            </div>

            {/* Enabled Checklists */}
            <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 10 }}>
                <FiClipboard size={18} /> Regulatory Checklists ({enabledChecklistCount})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {checklists.filter(cl => cl.enabled).map(checklist => (
                  <div key={checklist.id} style={{ background: 'rgba(99, 102, 241, 0.1)', borderRadius: 12, padding: 16, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <FiCheckCircle size={16} color="#6366f1" />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{checklist.name}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>• {checklist.items.length} items</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{checklist.description}</p>
                  </div>
                ))}
                {enabledChecklistCount === 0 && (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
                    <p>No checklists enabled. Go to the Checklists tab to enable regulatory frameworks.</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Context Preview */}
            <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 10 }}>
                🤖 AI Context / System Prompt
              </h3>
              <div style={{ 
                background: 'rgba(0,0,0,0.3)', 
                borderRadius: 12, 
                padding: 16, 
                maxHeight: 200, 
                overflow: 'auto',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <pre style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.85rem', 
                  lineHeight: 1.6, 
                  margin: 0, 
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit'
                }}>
                  {aiContext}
                </pre>
              </div>
            </div>

            {/* Run Evaluation Button */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button
                onClick={() => setActiveTab('documents')}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  padding: '14px 28px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <FiArrowLeft size={18} /> Back to Edit
              </button>
              <button
                onClick={runEvaluation}
                disabled={evaluating || selectedCount === 0}
                style={{
                  background: evaluating ? 'rgba(100,100,100,0.3)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px 36px',
                  color: 'white',
                  cursor: evaluating || selectedCount === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  opacity: selectedCount === 0 ? 0.5 : 1,
                  boxShadow: selectedCount > 0 && !evaluating ? '0 4px 24px rgba(34, 197, 94, 0.5)' : 'none'
                }}
              >
                <FiPlay size={20} /> {evaluating ? 'Evaluating...' : 'Proceed to AI Evaluation'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div>
            {evaluating ? (
              <div style={{ textAlign: 'center', padding: 80, background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ 
                  width: 64, 
                  height: 64, 
                  margin: '0 auto 24px',
                  border: '4px solid rgba(34, 211, 238, 0.2)',
                  borderTopColor: '#22d3ee',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <h3 style={{ fontSize: '1.4rem', marginBottom: 12, color: '#22d3ee' }}>🔍 AI Evaluation in Progress...</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                  Analyzing <span style={{ color: '#22c55e', fontWeight: 600 }}>{selectedCount} documents</span> against <span style={{ color: '#6366f1', fontWeight: 600 }}>{enabledChecklistCount} regulatory checklists</span>
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 16, opacity: 0.7 }}>
                  This may take a minute depending on document complexity...
                </p>
              </div>
            ) : evaluation ? (
              <div>
                {/* Evaluation Results Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}>
                  <div style={{ background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15), rgba(99, 102, 241, 0.15))', borderRadius: 16, padding: 24, border: '2px solid rgba(34, 211, 238, 0.3)', textAlign: 'center', boxShadow: '0 4px 20px rgba(34, 211, 238, 0.1)' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 800, background: 'linear-gradient(135deg, #22d3ee, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {evaluation.overallScore}%
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Overall Score</div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '1.8rem', 
                      fontWeight: 700, 
                      color: evaluation.riskLevel === 'low' ? '#22c55e' : evaluation.riskLevel === 'medium' ? '#f59e0b' : '#ef4444',
                      textTransform: 'uppercase'
                    }}>
                      {evaluation.riskLevel === 'low' ? '🟢' : evaluation.riskLevel === 'medium' ? '🟡' : '🔴'} {evaluation.riskLevel}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Risk Level</div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                      {evaluation.recommendation === 'approve' ? '✅ Approve' : 
                       evaluation.recommendation === 'conditional-approval' ? '⚠️ Conditional' :
                       evaluation.recommendation === 'reject' ? '❌ Reject' : '🔍 Review'}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Recommendation</div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22d3ee' }}>
                      {evaluation.complianceScore || 0}%
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Compliance</div>
                  </div>
                </div>

                {/* AI Insights */}
                <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', borderRadius: 16, padding: 28, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 20, color: '#22d3ee' }}>📋 Detailed AI Assessment</h3>
                  <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    fontSize: '0.9rem', 
                    lineHeight: 1.8, 
                    color: 'var(--text-primary)',
                    background: 'rgba(0,0,0,0.3)',
                    padding: 24,
                    borderRadius: 12,
                    maxHeight: 600,
                    overflow: 'auto',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {evaluation.aiInsights || 'No detailed insights available.'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 80, background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', borderRadius: 16, border: '2px dashed rgba(255,255,255,0.1)' }}>
                <FiClipboard size={64} style={{ marginBottom: 20, opacity: 0.3, color: '#22d3ee' }} />
                <h3 style={{ fontSize: '1.3rem', marginBottom: 12, color: 'var(--text-primary)' }}>No Evaluation Yet</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: 400, margin: '0 auto' }}>
                  Configure your documents and regulatory checklists, then click <span style={{ color: '#22c55e', fontWeight: 600 }}>"Run AI Evaluation"</span> to generate an assessment.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* CSS for animations and dark theme fixes */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Fix select dropdown options for dark theme */
        select option {
          background-color: #1e293b !important;
          color: #e2e8f0 !important;
          padding: 10px;
        }
        
        select:focus {
          outline: none;
          border-color: #22d3ee !important;
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.2);
        }
        
        /* Improve textarea focus */
        textarea:focus {
          outline: none;
          border-color: #22d3ee !important;
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.2);
        }
        
        /* Button hover effects */
        button:hover:not(:disabled) {
          filter: brightness(1.1);
        }
        
        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(100,100,100,0.5);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(100,100,100,0.7);
        }
      `}</style>
    </div>
  );
};

export default EvaluationConfigPage;
