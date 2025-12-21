/**
 * AI Summary Panel Component
 * 
 * Displays AI-generated insights for projects including:
 * - Overall status summary
 * - Bottleneck analysis
 * - Risk assessment
 * - Recommendations
 * - Pending on whom analysis
 */

import React, { useState, useEffect, useCallback } from 'react';
import { projectsApi, ProjectAISummary, Project, RiskLevel } from '../services/projects.api';

// =============================================================================
// TYPES
// =============================================================================

interface AISummaryPanelProps {
  projectId: string;
  projectName?: string;
  onClose?: () => void;
  embedded?: boolean;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
  } as React.CSSProperties,
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px 24px',
    color: '#ffffff',
  } as React.CSSProperties,
  headerTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  } as React.CSSProperties,
  headerSubtitle: {
    fontSize: '13px',
    opacity: 0.9,
  } as React.CSSProperties,
  content: {
    padding: '20px 24px',
  } as React.CSSProperties,
  section: {
    marginBottom: '24px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  statusCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  } as React.CSSProperties,
  statusText: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.6',
  } as React.CSSProperties,
  riskIndicator: (level: RiskLevel) => {
    const colors: Record<RiskLevel, { bg: string; border: string; text: string }> = {
      'low': { bg: '#dcfce7', border: '#86efac', text: '#166534' },
      'medium': { bg: '#fef9c3', border: '#fde047', text: '#854d0e' },
      'high': { bg: '#fed7aa', border: '#fb923c', text: '#c2410c' },
      'critical': { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
    };
    const color = colors[level];
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 14px',
      backgroundColor: color.bg,
      border: `2px solid ${color.border}`,
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '600',
      color: color.text,
    } as React.CSSProperties;
  },
  riskBar: {
    display: 'flex',
    gap: '4px',
    marginTop: '8px',
  } as React.CSSProperties,
  riskSegment: (active: boolean, level: RiskLevel) => {
    const colors: Record<RiskLevel, string> = {
      'low': '#22c55e',
      'medium': '#eab308',
      'high': '#f97316',
      'critical': '#ef4444',
    };
    return {
      flex: 1,
      height: '6px',
      backgroundColor: active ? colors[level] : '#e2e8f0',
      borderRadius: '3px',
      transition: 'background-color 0.3s',
    } as React.CSSProperties;
  },
  bottleneckCard: {
    backgroundColor: '#fef2f2',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: '1px solid #fecaca',
  } as React.CSSProperties,
  bottleneckInfo: {
    flex: 1,
  } as React.CSSProperties,
  bottleneckTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '2px',
  } as React.CSSProperties,
  bottleneckMeta: {
    fontSize: '11px',
    color: '#64748b',
  } as React.CSSProperties,
  bottleneckDays: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#dc2626',
    marginLeft: '12px',
  } as React.CSSProperties,
  recommendationList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  } as React.CSSProperties,
  recommendationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #bbf7d0',
  } as React.CSSProperties,
  recommendationIcon: {
    fontSize: '16px',
    marginTop: '1px',
  } as React.CSSProperties,
  recommendationText: {
    fontSize: '13px',
    color: '#166534',
    lineHeight: '1.5',
  } as React.CSSProperties,
  pendingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginTop: '12px',
  } as React.CSSProperties,
  pendingCard: (type: 'internal' | 'external' | 'vendor') => {
    const colors = {
      'internal': { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
      'external': { bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6' },
      'vendor': { bg: '#fdf4ff', border: '#f0abfc', text: '#a21caf' },
    };
    const color = colors[type];
    return {
      textAlign: 'center' as const,
      padding: '16px',
      backgroundColor: color.bg,
      border: `1px solid ${color.border}`,
      borderRadius: '10px',
    } as React.CSSProperties;
  },
  pendingCount: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '4px',
  } as React.CSSProperties,
  pendingLabel: {
    fontSize: '12px',
    fontWeight: '500',
  } as React.CSSProperties,
  delayBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#fef3c7',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#92400e',
    marginTop: '8px',
  } as React.CSSProperties,
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    color: '#64748b',
  } as React.CSSProperties,
  error: {
    textAlign: 'center' as const,
    padding: '32px',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    margin: '16px',
  } as React.CSSProperties,
  timestamp: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '8px',
  } as React.CSSProperties,
  ownerTypeBadge: (type: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'internal': { bg: '#dbeafe', text: '#2563eb' },
      'external': { bg: '#e0e7ff', text: '#4f46e5' },
      'vendor': { bg: '#fae8ff', text: '#a21caf' },
    };
    const color = colors[type] || colors['internal'];
    return {
      display: 'inline-block',
      padding: '2px 8px',
      fontSize: '10px',
      fontWeight: '600',
      borderRadius: '10px',
      backgroundColor: color.bg,
      color: color.text,
      marginLeft: '8px',
    } as React.CSSProperties;
  },
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const RiskLevelIndicator: React.FC<{ level: RiskLevel }> = ({ level }) => {
  const levels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  const currentIndex = levels.indexOf(level);
  
  const icons: Record<RiskLevel, string> = {
    'low': '✅',
    'medium': '⚠️',
    'high': '🔶',
    'critical': '🚨',
  };

  return (
    <div>
      <span style={styles.riskIndicator(level)}>
        {icons[level]} Risk Level: {level.toUpperCase()}
      </span>
      <div style={styles.riskBar}>
        {levels.map((l, i) => (
          <div 
            key={l} 
            style={styles.riskSegment(i <= currentIndex, levels[i])} 
          />
        ))}
      </div>
    </div>
  );
};

const Spinner: React.FC = () => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    style={{ animation: 'spin 1s linear infinite' }}
  >
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    <circle 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="#e2e8f0" 
      strokeWidth="3" 
      fill="none" 
    />
    <path 
      d="M12 2 A10 10 0 0 1 22 12" 
      stroke="#3b82f6" 
      strokeWidth="3" 
      fill="none" 
      strokeLinecap="round"
    />
  </svg>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AISummaryPanel: React.FC<AISummaryPanelProps> = ({
  projectId,
  projectName,
  onClose,
  embedded = false,
}) => {
  const [summary, setSummary] = useState<ProjectAISummary | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const [summaryRes, projectRes] = await Promise.all([
        projectsApi.getSummary(projectId, refresh),
        projectsApi.get(projectId),
      ]);
      
      setSummary(summaryRes.data.summary);
      setProject(projectRes.data.project);
    } catch (err: any) {
      console.error('Failed to load AI summary:', err);
      setError(err.response?.data?.error || 'Failed to load AI summary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <Spinner />
          <span style={{ marginLeft: '12px' }}>Generating AI insights...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Error Loading Summary</div>
          <div style={{ fontSize: '13px' }}>{error}</div>
          <button 
            style={{ ...styles.refreshButton, margin: '16px auto 0' }}
            onClick={() => loadSummary()}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>📊</div>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>No Summary Available</div>
          <div style={{ fontSize: '13px' }}>Generate an AI summary for this project</div>
          <button 
            style={{ ...styles.refreshButton, margin: '16px auto 0' }}
            onClick={() => loadSummary(true)}
          >
            🤖 Generate Summary
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={styles.headerTitle}>
              🤖 AI Project Intelligence
            </div>
            <div style={styles.headerSubtitle}>
              {projectName || project?.name || 'Project Analysis'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              style={{ 
                ...styles.refreshButton, 
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
              }}
              onClick={() => loadSummary(true)}
              disabled={refreshing}
            >
              {refreshing ? '⏳' : '🔄'} Refresh
            </button>
            {onClose && (
              <button 
                style={{ 
                  ...styles.refreshButton, 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#ffffff',
                }}
                onClick={onClose}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Risk Assessment */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            📊 Risk Assessment
          </div>
          <RiskLevelIndicator level={summary.riskLevel} />
          {summary.estimatedDelayDays !== undefined && summary.estimatedDelayDays > 0 && (
            <div style={styles.delayBadge}>
              ⏰ Estimated Delay: {summary.estimatedDelayDays} days
            </div>
          )}
        </div>

        {/* Overall Status */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            📋 Overall Status
          </div>
          <div style={styles.statusCard}>
            <div style={styles.statusText}>
              {summary.overallStatus}
            </div>
          </div>
        </div>

        {/* Pending Items */}
        {summary.pendingItems && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              ⏳ Pending Items
            </div>
            <div style={styles.statusCard}>
              <div style={styles.statusText}>
                {summary.pendingItems}
              </div>
            </div>
          </div>
        )}

        {/* Pending By Owner Type */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            👥 Tasks Pending By Type
          </div>
          <div style={styles.pendingGrid}>
            <div style={styles.pendingCard('internal')}>
              <div style={{ ...styles.pendingCount, color: '#1d4ed8' }}>
                {summary.pendingOnInternal || 0}
              </div>
              <div style={{ ...styles.pendingLabel, color: '#1d4ed8' }}>
                Internal
              </div>
            </div>
            <div style={styles.pendingCard('external')}>
              <div style={{ ...styles.pendingCount, color: '#5b21b6' }}>
                {summary.pendingOnExternal || 0}
              </div>
              <div style={{ ...styles.pendingLabel, color: '#5b21b6' }}>
                External
              </div>
            </div>
            <div style={styles.pendingCard('vendor')}>
              <div style={{ ...styles.pendingCount, color: '#a21caf' }}>
                {summary.pendingOnVendors || 0}
              </div>
              <div style={{ ...styles.pendingLabel, color: '#a21caf' }}>
                Vendors
              </div>
            </div>
          </div>
        </div>

        {/* Bottlenecks */}
        {summary.bottlenecks && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              🚧 Bottleneck Analysis
            </div>
            <div style={styles.statusCard}>
              <div style={styles.statusText}>
                {summary.bottlenecks}
              </div>
            </div>
          </div>
        )}

        {/* Top Blockers */}
        {summary.topBlockers && summary.topBlockers.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              🔴 Top Blocking Tasks
            </div>
            {summary.topBlockers.map((blocker, index) => (
              <div key={index} style={styles.bottleneckCard}>
                <div style={styles.bottleneckInfo}>
                  <div style={styles.bottleneckTitle}>
                    {blocker.taskTitle}
                    <span style={styles.ownerTypeBadge(blocker.ownerType)}>
                      {blocker.ownerType}
                    </span>
                  </div>
                  <div style={styles.bottleneckMeta}>
                    Assigned to: {blocker.owner}
                  </div>
                </div>
                <div style={styles.bottleneckDays}>
                  {blocker.blockedDays}d
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Risk Assessment Details */}
        {summary.riskAssessment && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              ⚠️ Risk Details
            </div>
            <div style={styles.statusCard}>
              <div style={styles.statusText}>
                {summary.riskAssessment}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {summary.recommendations && summary.recommendations.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              💡 AI Recommendations
            </div>
            <ul style={styles.recommendationList}>
              {summary.recommendations.map((recommendation, index) => (
                <li key={index} style={styles.recommendationItem}>
                  <span style={styles.recommendationIcon}>
                    {index === 0 ? '🎯' : index === 1 ? '📌' : '💡'}
                  </span>
                  <span style={styles.recommendationText}>
                    {recommendation}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp */}
        <div style={styles.timestamp}>
          Last updated: {new Date(summary.generatedAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// COMPACT VERSION FOR EMBEDDING
// =============================================================================

export const AISummaryCompact: React.FC<{
  summary: ProjectAISummary;
  onExpand?: () => void;
}> = ({ summary, onExpand }) => (
  <div 
    style={{
      backgroundColor: '#fefce8',
      border: '1px solid #fef08a',
      borderRadius: '12px',
      padding: '16px',
      cursor: onExpand ? 'pointer' : 'default',
    }}
    onClick={onExpand}
  >
    <div style={{ 
      fontSize: '14px', 
      fontWeight: '600', 
      color: '#92400e', 
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      🤖 AI Summary
      <span style={styles.riskIndicator(summary.riskLevel)}>
        {summary.riskLevel}
      </span>
    </div>
    <div style={{ fontSize: '13px', color: '#78350f', lineHeight: '1.5' }}>
      {summary.overallStatus.length > 200 
        ? summary.overallStatus.substring(0, 200) + '...' 
        : summary.overallStatus
      }
    </div>
    {summary.recommendations.length > 0 && (
      <div style={{ marginTop: '8px', fontSize: '12px', color: '#a16207' }}>
        💡 {summary.recommendations.length} recommendation{summary.recommendations.length > 1 ? 's' : ''} available
      </div>
    )}
    {onExpand && (
      <div style={{ 
        marginTop: '12px', 
        fontSize: '12px', 
        color: '#3b82f6',
        fontWeight: '600',
      }}>
        Click to expand full analysis →
      </div>
    )}
  </div>
);

// =============================================================================
// DASHBOARD INSIGHTS CARD
// =============================================================================

export const DashboardAIInsights: React.FC<{
  insights: string;
  topActions?: string[];
  riskSummary?: string;
}> = ({ insights, topActions, riskSummary }) => (
  <div style={styles.container}>
    <div style={{ 
      ...styles.header, 
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🤖 AI Dashboard Insights
      </div>
    </div>
    <div style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
        {insights}
      </div>
      
      {topActions && topActions.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            🎯 Priority Actions
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {topActions.slice(0, 3).map((action, i) => (
              <li key={i} style={{ marginBottom: '6px', fontSize: '13px', color: '#475569' }}>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {riskSummary && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#fef3c7', 
          borderRadius: '8px',
          fontSize: '13px',
          color: '#92400e',
        }}>
          ⚠️ {riskSummary}
        </div>
      )}
    </div>
  </div>
);

export default AISummaryPanel;
