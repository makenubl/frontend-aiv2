import React, { useState } from 'react';
import { FiCheckCircle, FiXCircle, FiAlertCircle, FiInfo, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { ApplicationFolder, ComprehensiveEvaluation, EvaluationComment } from '../services/applications.api';

interface Props {
  application: ApplicationFolder;
  evaluation: ComprehensiveEvaluation;
}

export const ApplicationDetailView: React.FC<Props> = ({ application, evaluation }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'aiInsights']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'approve': return 'badge-success';
      case 'conditional-approval': return 'badge-warning';
      case 'reject': return 'badge-error';
      default: return 'badge-info';
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low': return 'badge-success';
      case 'medium': return 'badge-warning';
      case 'high': case 'critical': return 'badge-error';
      default: return 'badge-info';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': case 'high': return <FiXCircle color="#EF4444" />;
      case 'medium': return <FiAlertCircle color="#F59E0B" />;
      case 'low': return <FiInfo color="#3B82F6" />;
      default: return <FiCheckCircle color="#10B981" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'compliance': return 'badge-success';
      case 'corporate': return 'badge-info';
      case 'financial': return 'badge-warning';
      case 'regulatory': return 'badge-error';
      case 'legal': return 'badge-info';
      case 'personnel': return 'badge-success';
      case 'technical': return 'badge-info';
      default: return 'badge-info';
    }
  };

  const groupCommentsByCategory = (comments: EvaluationComment[]) => {
    return comments.reduce((acc, comment) => {
      if (!acc[comment.category]) {
        acc[comment.category] = [];
      }
      acc[comment.category].push(comment);
      return acc;
    }, {} as Record<string, EvaluationComment[]>);
  };

  const commentsByCategory = groupCommentsByCategory(evaluation.comments);

  return (
    <div className="application-detail-view">
      {/* Header */}
      <div className="detail-header card-glass">
        <div>
          <h2 className="text-lg font-bold">{application.applicationData.companyName}</h2>
          <p className="text-xs text-secondary">{application.applicationData.appName} · {application.id}</p>
        </div>
        <div className="flex gap-sm">
          <div className={`badge ${getRiskBadge(evaluation.riskLevel)}`}>
            Risk: {evaluation.riskLevel}
          </div>
          <div className={`badge ${getRecommendationBadge(evaluation.recommendation)}`}>
            {evaluation.recommendation}
          </div>
        </div>
      </div>

      {/* Score Dashboard */}
      <div className="score-dashboard">
        <div className="score-card card-glass">
          <p className="text-xs text-secondary">Overall Score</p>
          <div className="score-circle" style={{
            background: `conic-gradient(#0066FF ${evaluation.overallScore}%, #E5E7EB ${evaluation.overallScore}%)`
          }}>
            <div className="score-inner">
              <span className="text-xl font-bold">{evaluation.overallScore}</span>
            </div>
          </div>
        </div>
        <div className="score-breakdown">
          <div className="score-item">
            <div className="flex justify-between items-center">
              <span className="text-xs text-secondary">Compliance</span>
              <span className="text-xs font-semibold">{evaluation.complianceScore}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{width: `${evaluation.complianceScore}%`, background: '#10B981'}}></div>
            </div>
          </div>
          <div className="score-item">
            <div className="flex justify-between items-center">
              <span className="text-xs text-secondary">Technical</span>
              <span className="text-xs font-semibold">{evaluation.technicalScore}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{width: `${evaluation.technicalScore}%`, background: '#3B82F6'}}></div>
            </div>
          </div>
          <div className="score-item">
            <div className="flex justify-between items-center">
              <span className="text-xs text-secondary">Business</span>
              <span className="text-xs font-semibold">{evaluation.businessScore}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{width: `${evaluation.businessScore}%`, background: '#F59E0B'}}></div>
            </div>
          </div>
          <div className="score-item">
            <div className="flex justify-between items-center">
              <span className="text-xs text-secondary">Regulatory</span>
              <span className="text-xs font-semibold">{evaluation.regulatoryScore}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{width: `${evaluation.regulatoryScore}%`, background: '#8B5CF6'}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="detail-section">
        <div className="section-header" onClick={() => toggleSection('aiInsights')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 className="text-sm font-semibold">🤖 AI Regulatory Assessment</h3>
            {evaluation.modelUsed && (
              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                {evaluation.modelUsed}
              </span>
            )}
          </div>
          {expandedSections.has('aiInsights') ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        {expandedSections.has('aiInsights') && (
          <div className="section-content card-glass" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <div className="text-xs ai-insights-content" style={{whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: 'inherit'}}>
              {evaluation.aiInsights.split('\n').map((line, idx) => {
                // Style headers (lines starting with # or **)
                if (line.startsWith('**') || line.startsWith('##') || line.startsWith('# ')) {
                  return <div key={idx} style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>{line.replace(/\*\*/g, '').replace(/##/g, '').replace(/# /g, '')}</div>;
                }
                // Style bullet points
                if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
                  return <div key={idx} style={{ paddingLeft: '1rem', marginBottom: '0.25rem' }}>{line}</div>;
                }
                // Style numbered items
                if (/^\d+\./.test(line.trim())) {
                  return <div key={idx} style={{ paddingLeft: '0.5rem', marginBottom: '0.25rem', fontWeight: 500 }}>{line}</div>;
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
      </div>

      {/* AI Document Categories */}
      {evaluation.aiDocumentCategories && evaluation.aiDocumentCategories.length > 0 && (
        <div className="detail-section">
          <div className="section-header" onClick={() => toggleSection('aiDocs')}>
            <h3 className="text-sm font-semibold">AI Document Classification ({evaluation.aiDocumentCategories.length})</h3>
            {expandedSections.has('aiDocs') ? <FiChevronUp /> : <FiChevronDown />}
          </div>
          {expandedSections.has('aiDocs') && (
            <div className="section-content card-glass">
              <div className="docs-grid">
                {evaluation.aiDocumentCategories.map((doc, idx) => (
                  <div key={idx} className="doc-chip">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold" title={doc.notes}>{doc.name}</span>
                      <span className="badge badge-info">{Math.round((doc.relevanceScore || 0) * 100)}%</span>
                    </div>
                    <div className="text-xs" style={{marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <span className={`badge ${getCategoryBadge(doc.category)}`}>{doc.category}</span>
                      <span style={{color: '#4B5563'}}>{doc.subcategory}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comments by Category */}
      <div className="detail-section">
        <div className="section-header" onClick={() => toggleSection('comments')}>
          <h3 className="text-sm font-semibold">Evaluation Comments ({evaluation.comments.length})</h3>
          {expandedSections.has('comments') ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        {expandedSections.has('comments') && (
          <div className="comments-container">
            {Object.entries(commentsByCategory).map(([category, comments]) => (
              <div key={category} className="comment-category">
                <h4 className="text-xs font-semibold text-secondary" style={{textTransform: 'capitalize', marginBottom: '0.5rem'}}>
                  {category} ({comments.length})
                </h4>
                {comments.map((comment, idx) => (
                  <div key={idx} className="comment-card card-glass">
                    <div className="flex gap-sm items-start">
                      {getSeverityIcon(comment.severity)}
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h5 className="text-xs font-semibold">{comment.title}</h5>
                          <span className={`badge badge-${comment.severity === 'critical' || comment.severity === 'high' ? 'error' : comment.severity === 'medium' ? 'warning' : 'info'}`}>
                            {comment.severity}
                          </span>
                        </div>
                        <p className="text-xs text-secondary" style={{marginTop: '0.25rem'}}>
                          {comment.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conditions */}
      {evaluation.conditions.length > 0 && (
        <div className="detail-section">
          <div className="section-header" onClick={() => toggleSection('conditions')}>
            <h3 className="text-sm font-semibold">Conditions ({evaluation.conditions.length})</h3>
            {expandedSections.has('conditions') ? <FiChevronUp /> : <FiChevronDown />}
          </div>
          {expandedSections.has('conditions') && (
            <div className="section-content card-glass">
              <ul className="conditions-list">
                {evaluation.conditions.map((condition, idx) => (
                  <li key={idx} className="text-xs">{condition}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Next Steps */}
      {evaluation.nextSteps.length > 0 && (
        <div className="detail-section">
          <div className="section-header" onClick={() => toggleSection('nextSteps')}>
            <h3 className="text-sm font-semibold">Next Steps ({evaluation.nextSteps.length})</h3>
            {expandedSections.has('nextSteps') ? <FiChevronUp /> : <FiChevronDown />}
          </div>
          {expandedSections.has('nextSteps') && (
            <div className="section-content card-glass">
              <ol className="next-steps-list">
                {evaluation.nextSteps.map((step, idx) => (
                  <li key={idx} className="text-xs">{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
