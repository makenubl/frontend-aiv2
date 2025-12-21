/**
 * AI Analysis Step
 * 
 * Step 3 of the wizard - AI analyzes documents and extracts
 * tasks, action items, deliverables, and deadlines
 */

import React, { useState } from 'react';
import {
  UploadedFile, 
  ExtractedTask, 
  getPriorityColor, 
  getConfidenceColor 
} from '../../services/projectTracker';

// Default system prompt for task extraction
export const DEFAULT_EXTRACTION_PROMPT = `You are an expert project manager AI assistant specialized in extracting actionable items from documents.

Your job is to analyze the provided text and extract:

1. **Tasks** - Clear work items that need to be completed
2. **Action Items** - Specific actions that someone needs to take
3. **Deliverables** - Tangible outputs or results that must be produced
4. **Deadlines** - Time-sensitive dates or timeframes (explicit or reasonably inferred)

For each item extracted, identify:
- **Assigned Person/Vendor** - Who is responsible (look for names, titles, departments, @mentions, company names)
- **Due Date** - When it's due (explicit dates or inferred from context like "next week", "by Q1")
- **Priority** - Urgency level based on language used (critical, high, medium, low)

IMPORTANT RULES:
- Be CONSERVATIVE: Only extract clear, actionable items. Skip vague or unclear items.
- Be EXPLAINABLE: For each extraction, provide the source text and your reasoning.
- Be HONEST: Rate confidence 0.0-1.0 based on clarity of the information.
- NEVER hallucinate: If information isn't in the text, don't invent it.
- Handle ambiguity: Flag uncertain items with lower confidence rather than guessing.

For owner/assignee inference:
- Look for names, email addresses, @mentions, titles, departments, or company names
- Categorize as: "internal" (employee), "external" (contractor), or "vendor" (company)
- If owner is unclear, leave as null

For deadline inference:
- Look for explicit dates, relative timeframes (next week, by Friday), urgency words
- Only infer dates if there's strong evidence in the text
- Use ISO 8601 format (YYYY-MM-DD) for dates`;

interface AIAnalysisStepProps {
  sessionId: string;
  files: UploadedFile[];
  extractedTasks: ExtractedTask[];
  onStartAnalysis: (customPrompt?: string) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  isAnalyzing: boolean;
  analysisProgress: {
    current: number;
    total: number;
    currentFile?: string;
  };
}

export const AIAnalysisStep: React.FC<AIAnalysisStepProps> = ({
  sessionId,
  files,
  extractedTasks,
  onStartAnalysis,
  onNext,
  onBack,
  isAnalyzing,
  analysisProgress,
}) => {
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showPromptEditor, setShowPromptEditor] = useState(true);
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_EXTRACTION_PROMPT);

  // Don't auto-start - let user configure prompt first
  // useEffect removed - user must click "Start Analysis"

  const handleStartAnalysis = () => {
    setAnalysisStarted(true);
    setShowPromptEditor(false);
    onStartAnalysis(customPrompt);
  };

  const handleResetPrompt = () => {
    setCustomPrompt(DEFAULT_EXTRACTION_PROMPT);
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const analyzedFiles = files.filter(f => f.analysisStatus === 'completed');
  const pendingFiles = files.filter(f => f.analysisStatus === 'pending' || f.analysisStatus === 'analyzing');
  const errorFiles = files.filter(f => f.analysisStatus === 'error');

  const groupedTasks = {
    tasks: extractedTasks.filter(t => t.type === 'task'),
    actionItems: extractedTasks.filter(t => t.type === 'action_item'),
    deliverables: extractedTasks.filter(t => t.type === 'deliverable'),
    deadlines: extractedTasks.filter(t => t.type === 'deadline'),
  };

  const formatDeadline = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="wizard-step-content ai-analysis-step">
      <div className="step-header" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '36px'
      }}>
        <div className="step-icon" style={{
          width: '72px',
          height: '72px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25))',
          border: '2px solid rgba(99, 102, 241, 0.4)',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2)'
        }}>🤖</div>
        <div className="step-header-text">
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: 700,
            color: '#f8fafc',
            letterSpacing: '-0.025em',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>AI Document Analysis</h2>
          <p style={{
            margin: 0,
            color: '#94a3b8',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            lineHeight: 1.6
          }}>Configure and run AI to extract tasks, action items, deliverables, and deadlines</p>
        </div>
      </div>

      {/* Prompt Configuration Section - Show before analysis starts */}
      {!analysisStarted && !isAnalyzing && (
        <div className="prompt-config-section" style={{
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '24px',
          marginBottom: '28px',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
        }}>
          <div className="prompt-header" onClick={() => setShowPromptEditor(!showPromptEditor)} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 28px',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            borderBottom: showPromptEditor ? '1px solid rgba(99, 102, 241, 0.15)' : 'none'
          }}>
            <div className="prompt-header-left" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <span className="prompt-icon" style={{ fontSize: '28px' }}>⚙️</span>
              <div>
                <h3 style={{
                  margin: '0 0 6px 0',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#f1f5f9',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '-0.02em'
                }}>AI Analysis Configuration</h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#94a3b8',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}>Customize the instructions for the AI task extractor</p>
              </div>
            </div>
            <button className="prompt-toggle-btn" style={{
              width: '40px',
              height: '40px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '12px',
              color: '#a5b4fc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}>
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{ 
                  width: '20px', 
                  height: '20px',
                  transform: showPromptEditor ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.2s' 
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {showPromptEditor && (
            <div className="prompt-editor-container" style={{ padding: '0 28px 28px' }}>
              <div className="prompt-info-bar" style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '18px 20px',
                margin: '20px 0',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '14px',
                fontSize: '14px',
                color: '#cbd5e1',
                lineHeight: 1.6,
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                <span className="info-icon" style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>💡</span>
                <span>This prompt guides how the AI analyzes your documents and extracts tasks. Customize it to focus on specific types of items or terminology used in your documents.</span>
              </div>

              <div className="prompt-editor" style={{
                background: 'rgba(2, 6, 23, 0.7)',
                border: '2px solid rgba(71, 85, 105, 0.4)',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 12px rgba(0, 0, 0, 0.3)'
              }}>
                <div className="prompt-editor-header" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderBottom: '1px solid rgba(71, 85, 105, 0.3)'
                }}>
                  <label style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#e2e8f0',
                    letterSpacing: '0.02em',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}>System Prompt</label>
                  <button 
                    className="btn-reset-prompt" 
                    onClick={handleResetPrompt}
                    title="Reset to default prompt"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.35)',
                      borderRadius: '10px',
                      color: '#a5b4fc',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M1 4v6h6M23 20v-6h-6" />
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                    </svg>
                    Reset to Default
                  </button>
                </div>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Enter custom instructions for the AI..."
                  rows={12}
                  style={{
                    width: '100%',
                    minHeight: '340px',
                    padding: '24px',
                    background: 'transparent',
                    border: 'none',
                    color: '#f1f5f9',
                    fontFamily: '"SF Mono", "Fira Code", "JetBrains Mono", "Cascadia Code", Consolas, Monaco, monospace',
                    fontSize: '14px',
                    lineHeight: 1.8,
                    resize: 'vertical',
                    letterSpacing: '0.01em',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <div className="prompt-editor-footer" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  borderTop: '1px solid rgba(71, 85, 105, 0.3)'
                }}>
                  <span style={{
                    fontSize: '13px',
                    color: '#64748b',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontWeight: 500
                  }}>{customPrompt.length} characters</span>
                  <span style={{
                    fontSize: '12px',
                    color: '#475569',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}>Powered by OpenAI GPT-4o</span>
                </div>
              </div>

              <div className="extraction-targets" style={{ marginTop: '32px' }}>
                <h4 style={{
                  margin: '0 0 18px 0',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '-0.01em'
                }}>What the AI will extract:</h4>
                <div className="targets-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '14px'
                }}>
                  <div className="target-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '18px 20px',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(51, 65, 85, 0.4))',
                    border: '1px solid rgba(71, 85, 105, 0.35)',
                    borderRadius: '14px',
                    transition: 'all 0.2s ease'
                  }}>
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>📋</span>
                    <div>
                      <strong style={{
                        display: 'block',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#f1f5f9',
                        marginBottom: '4px',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>Tasks</strong>
                      <span style={{
                        fontSize: '13px',
                        color: '#94a3b8',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>Work items to be completed</span>
                    </div>
                  </div>
                  <div className="target-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '18px 20px',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(51, 65, 85, 0.4))',
                    border: '1px solid rgba(71, 85, 105, 0.35)',
                    borderRadius: '14px',
                    transition: 'all 0.2s ease'
                  }}>
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>✅</span>
                    <div>
                      <strong style={{
                        display: 'block',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#f1f5f9',
                        marginBottom: '4px',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>Action Items</strong>
                      <span style={{
                        fontSize: '13px',
                        color: '#94a3b8',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>Specific actions required</span>
                    </div>
                  </div>
                  <div className="target-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '18px 20px',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(51, 65, 85, 0.4))',
                    border: '1px solid rgba(71, 85, 105, 0.35)',
                    borderRadius: '14px',
                    transition: 'all 0.2s ease'
                  }}>
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>📦</span>
                    <div>
                      <strong style={{
                        display: 'block',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#f1f5f9',
                        marginBottom: '4px',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>Deliverables</strong>
                      <span style={{
                        fontSize: '13px',
                        color: '#94a3b8',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>Tangible outputs to produce</span>
                    </div>
                  </div>
                  <div className="target-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '18px 20px',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(51, 65, 85, 0.4))',
                    border: '1px solid rgba(71, 85, 105, 0.35)',
                    borderRadius: '14px',
                    transition: 'all 0.2s ease'
                  }}>
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>⏰</span>
                    <div>
                      <strong style={{
                        display: 'block',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#f1f5f9',
                        marginBottom: '4px',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>Deadlines</strong>
                      <span style={{
                        fontSize: '13px',
                        color: '#94a3b8',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>Time-sensitive dates</span>
                    </div>
                  </div>
                  <div className="target-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '18px 20px',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(51, 65, 85, 0.4))',
                    border: '1px solid rgba(71, 85, 105, 0.35)',
                    borderRadius: '14px',
                    transition: 'all 0.2s ease'
                  }}>
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>👤</span>
                    <div>
                      <strong style={{
                        display: 'block',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#f1f5f9',
                        marginBottom: '4px',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>Assignees</strong>
                      <span style={{
                        fontSize: '13px',
                        color: '#94a3b8',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>Person/vendor responsible</span>
                    </div>
                  </div>
                  <div className="target-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '18px 20px',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(51, 65, 85, 0.4))',
                    border: '1px solid rgba(71, 85, 105, 0.35)',
                    borderRadius: '14px',
                    transition: 'all 0.2s ease'
                  }}>
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>🎯</span>
                    <div>
                      <strong style={{
                        display: 'block',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#f1f5f9',
                        marginBottom: '4px',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>Priority</strong>
                      <span style={{
                        fontSize: '13px',
                        color: '#94a3b8',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>Urgency level inference</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="files-to-analyze" style={{ marginTop: '32px' }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1f2937',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '-0.01em'
                }}>Files to Analyze ({files.length})</h4>
                <div className="files-list-compact" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  paddingRight: '8px'
                }}>
                  {files.map(file => (
                    <div key={file.id} className="file-item-compact" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 18px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderLeft: '4px solid #667eea',
                      borderRadius: '12px',
                      transition: 'all 0.2s ease'
                    }}>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>📄</span>
                      <span style={{
                        flex: 1,
                        fontSize: '14px',
                        color: '#1f2937',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontWeight: 500
                      }}>{file.originalName}</span>
                      <span style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        fontWeight: 500,
                        fontFamily: '"SF Mono", "Fira Code", Consolas, monospace'
                      }}>{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="start-analysis-section" style={{ marginTop: '36px', textAlign: 'center' }}>
                <button 
                  onClick={handleStartAnalysis}
                  disabled={files.length === 0}
                  style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '24px 64px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none',
                    borderRadius: '18px',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 600,
                    cursor: files.length === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    letterSpacing: '-0.01em',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: files.length === 0 ? 0.5 : 1
                  }}
                >
                  <span style={{ fontSize: '32px', marginBottom: '8px' }}>🚀</span>
                  Start AI Analysis
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    opacity: 0.85,
                    marginTop: '8px',
                    letterSpacing: '0.02em'
                  }}>Using OpenAI GPT-4o</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className="analysis-progress-section">
          <div className="analysis-animation">
            <div className="ai-brain">
              <div className="brain-pulse"></div>
              <span className="brain-icon">🧠</span>
            </div>
            <div className="analysis-particles">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`particle particle-${i}`}>✨</div>
              ))}
            </div>
          </div>
          <div className="progress-info">
            <h3>Analyzing Documents with OpenAI GPT-4o</h3>
            <p className="current-file">{analysisProgress.currentFile || 'Connecting to AI service...'}</p>
            <div className="progress-bar-container">
              <div 
                className="progress-bar progress-bar-animated"
                style={{ 
                  width: analysisProgress.current > 0 
                    ? `${(analysisProgress.current / analysisProgress.total) * 100}%` 
                    : '100%',
                  animation: analysisProgress.current === 0 ? 'pulse 1.5s infinite' : 'none'
                }}
              />
            </div>
            <p className="progress-count">
              {analysisProgress.current > 0 
                ? `${analysisProgress.current} of ${analysisProgress.total} files analyzed`
                : 'AI is reading and understanding your documents...'}
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
              This may take a minute depending on document size
            </p>
          </div>
        </div>
      )}

      {/* No Tasks Found Message */}
      {!isAnalyzing && analysisStarted && extractedTasks.length === 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1))',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
          <h3 style={{ color: '#fbbf24', marginBottom: '12px' }}>No Tasks Found</h3>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>
            The AI couldn't find any clear tasks, action items, or deadlines in your documents.
          </p>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            This could happen if:
            <br />• The documents don't contain actionable items
            <br />• The text couldn't be extracted properly
            <br />• The content is in a format the AI can't parse
          </p>
          <button 
            className="btn-secondary" 
            style={{ marginTop: '16px' }}
            onClick={() => {
              setAnalysisStarted(false);
              setShowPromptEditor(true);
            }}
          >
            🔄 Configure & Try Again
          </button>
        </div>
      )}

      {/* Analysis Complete Summary */}
      {!isAnalyzing && extractedTasks.length > 0 && (
        <>
          <div className="analysis-summary">
            <div className="summary-card">
              <div className="summary-icon">📋</div>
              <div className="summary-value">{groupedTasks.tasks.length}</div>
              <div className="summary-label">Tasks</div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">✅</div>
              <div className="summary-value">{groupedTasks.actionItems.length}</div>
              <div className="summary-label">Action Items</div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">📦</div>
              <div className="summary-value">{groupedTasks.deliverables.length}</div>
              <div className="summary-label">Deliverables</div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">⏰</div>
              <div className="summary-value">{groupedTasks.deadlines.length}</div>
              <div className="summary-label">Deadlines</div>
            </div>
          </div>

          {/* File Analysis Status */}
          <div className="file-status-section">
            <h3>File Analysis Status</h3>
            <div className="status-badges">
              <span className="badge completed">
                ✓ {analyzedFiles.length} Analyzed
              </span>
              {pendingFiles.length > 0 && (
                <span className="badge pending">
                  ⋯ {pendingFiles.length} Pending
                </span>
              )}
              {errorFiles.length > 0 && (
                <span className="badge error">
                  ✕ {errorFiles.length} Failed
                </span>
              )}
            </div>
          </div>

          {/* Extracted Items */}
          <div className="extracted-items">
            {/* Tasks */}
            {groupedTasks.tasks.length > 0 && (
              <div className="item-group">
                <h3 className="group-title">
                  <span className="group-icon">📋</span>
                  Tasks ({groupedTasks.tasks.length})
                </h3>
                <div className="items-list">
                  {groupedTasks.tasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      expanded={expandedTasks.has(task.id)}
                      onToggle={() => toggleTaskExpansion(task.id)}
                      formatDeadline={formatDeadline}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {groupedTasks.actionItems.length > 0 && (
              <div className="item-group">
                <h3 className="group-title">
                  <span className="group-icon">✅</span>
                  Action Items ({groupedTasks.actionItems.length})
                </h3>
                <div className="items-list">
                  {groupedTasks.actionItems.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task}
                      expanded={expandedTasks.has(task.id)}
                      onToggle={() => toggleTaskExpansion(task.id)}
                      formatDeadline={formatDeadline}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Deliverables */}
            {groupedTasks.deliverables.length > 0 && (
              <div className="item-group">
                <h3 className="group-title">
                  <span className="group-icon">📦</span>
                  Deliverables ({groupedTasks.deliverables.length})
                </h3>
                <div className="items-list">
                  {groupedTasks.deliverables.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task}
                      expanded={expandedTasks.has(task.id)}
                      onToggle={() => toggleTaskExpansion(task.id)}
                      formatDeadline={formatDeadline}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Deadlines */}
            {groupedTasks.deadlines.length > 0 && (
              <div className="item-group">
                <h3 className="group-title">
                  <span className="group-icon">⏰</span>
                  Deadlines ({groupedTasks.deadlines.length})
                </h3>
                <div className="items-list">
                  {groupedTasks.deadlines.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task}
                      expanded={expandedTasks.has(task.id)}
                      onToggle={() => toggleTaskExpansion(task.id)}
                      formatDeadline={formatDeadline}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* No items found */}
      {!isAnalyzing && extractedTasks.length === 0 && analysisStarted && (
        <div className="no-items-found">
          <div className="no-items-icon">🔍</div>
          <h3>No items extracted</h3>
          <p>The AI could not find any tasks, action items, deliverables, or deadlines in the uploaded documents.</p>
          <button onClick={() => {
            setAnalysisStarted(false);
            setShowPromptEditor(true);
          }} className="btn-retry">
            🔄 Configure & Retry
          </button>
        </div>
      )}

      <div className="step-actions">
        <button onClick={onBack} className="btn-secondary" disabled={isAnalyzing}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          onClick={onNext}
          className="btn-primary"
          disabled={isAnalyzing || extractedTasks.length === 0}
        >
          Next: Assign Tasks
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <style>{`
        .ai-analysis-step {
          max-width: 900px;
          margin: 0 auto;
          padding: 32px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
        }
        
        .step-header {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 36px;
        }
        
        .step-icon {
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
        }
        
        .step-header-text h2 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: -0.02em;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
        }
        
        .step-header-text p {
          margin: 0;
          color: #94a3b8;
          font-size: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
          line-height: 1.5;
        }
        
        /* Analysis Progress Animation */
        .analysis-progress-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 60px 40px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          margin-bottom: 32px;
        }
        
        .analysis-animation {
          position: relative;
          width: 120px;
          height: 120px;
          margin-bottom: 32px;
        }
        
        .ai-brain {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .brain-icon {
          font-size: 50px;
          z-index: 2;
        }
        
        .brain-pulse {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(102, 126, 234, 0.3), transparent);
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 0.2; }
        }
        
        .analysis-particles {
          position: absolute;
          inset: -20px;
        }
        
        .particle {
          position: absolute;
          font-size: 14px;
          animation: orbit 3s linear infinite;
        }
        
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(60px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(60px) rotate(-360deg); }
        }
        
        .particle-0 { animation-delay: 0s; }
        .particle-1 { animation-delay: 0.375s; }
        .particle-2 { animation-delay: 0.75s; }
        .particle-3 { animation-delay: 1.125s; }
        .particle-4 { animation-delay: 1.5s; }
        .particle-5 { animation-delay: 1.875s; }
        .particle-6 { animation-delay: 2.25s; }
        .particle-7 { animation-delay: 2.625s; }
        
        .progress-info {
          text-align: center;
        }
        
        .progress-info h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: rgba(255, 255, 255, 0.95);
        }
        
        .current-file {
          margin: 0 0 16px 0;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .progress-bar-container {
          width: 300px;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin: 0 auto 12px;
        }
        
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        
        .progress-count {
          margin: 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }
        
        /* Analysis Summary */
        .analysis-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        
        @media (max-width: 768px) {
          .analysis-summary {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .summary-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
        }
        
        .summary-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }
        
        .summary-value {
          font-size: 32px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .summary-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 4px;
        }
        
        /* File Status */
        .file-status-section {
          margin-bottom: 24px;
        }
        
        .file-status-section h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7);
        }
        
        .status-badges {
          display: flex;
          gap: 12px;
        }
        
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
        }
        
        .badge.completed {
          background: rgba(34, 197, 94, 0.15);
          color: #86efac;
        }
        
        .badge.pending {
          background: rgba(234, 179, 8, 0.15);
          color: #fde047;
        }
        
        .badge.error {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
        }
        
        /* Extracted Items */
        .extracted-items {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        
        .item-group {
          /* No specific styles needed */
        }
        
        .group-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .group-icon {
          font-size: 18px;
        }
        
        .items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        /* No Items Found */
        .no-items-found {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 60px 40px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          text-align: center;
        }
        
        .no-items-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        
        .no-items-found h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .no-items-found p {
          margin: 0 0 24px 0;
          color: rgba(255, 255, 255, 0.5);
          max-width: 400px;
        }
        
        .btn-retry {
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-retry:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        
        /* Step Actions */
        .step-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-secondary svg {
          width: 18px;
          height: 18px;
        }
        
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        }
        
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-primary svg {
          width: 18px;
          height: 18px;
        }
      `}</style>
    </div>
  );
};

// Task Card Component
interface TaskCardProps {
  task: ExtractedTask;
  expanded: boolean;
  onToggle: () => void;
  formatDeadline: (date?: string) => string | null;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, expanded, onToggle, formatDeadline }) => {
  return (
    <div className={`task-card ${expanded ? 'expanded' : ''}`}>
      <div className="task-header" onClick={onToggle}>
        <div className="task-main">
          <h4 className="task-title">{task.title}</h4>
          <div className="task-meta">
            <span 
              className="priority-badge" 
              style={{ 
                background: `${getPriorityColor(task.priority)}20`,
                color: getPriorityColor(task.priority)
              }}
            >
              {task.priority}
            </span>
            {task.deadline && (
              <span className="deadline-badge">
                📅 {formatDeadline(task.deadline)}
              </span>
            )}
            <span 
              className="confidence-indicator"
              style={{ color: getConfidenceColor(task.confidence) }}
              title={`AI Confidence: ${Math.round(task.confidence * 100)}%`}
            >
              {task.confidence >= 0.8 ? '●●●' : task.confidence >= 0.5 ? '●●○' : '●○○'}
            </span>
          </div>
        </div>
        <div className="expand-icon">
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
      
      {expanded && (
        <div className="task-details">
          {task.description && (
            <div className="detail-section">
              <h5>Description</h5>
              <p>{task.description}</p>
            </div>
          )}
          {task.context && (
            <div className="detail-section">
              <h5>Context from Document</h5>
              <blockquote>{task.context}</blockquote>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">Source:</span>
            <span className="detail-value">{task.sourceFile}</span>
          </div>
        </div>
      )}
      
      <style>{`
        .task-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        
        .task-card:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        
        .task-card.expanded {
          border-color: rgba(102, 126, 234, 0.3);
        }
        
        .task-header {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          cursor: pointer;
        }
        
        .task-main {
          flex: 1;
          min-width: 0;
        }
        
        .task-title {
          margin: 0 0 6px 0;
          font-size: 14px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .task-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .priority-badge {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .deadline-badge {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }
        
        .confidence-indicator {
          font-size: 8px;
          letter-spacing: 1px;
        }
        
        .expand-icon {
          width: 24px;
          height: 24px;
          color: rgba(255, 255, 255, 0.4);
          flex-shrink: 0;
        }
        
        .expand-icon svg {
          width: 100%;
          height: 100%;
          transition: transform 0.2s ease;
        }
        
        .task-details {
          padding: 0 16px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          margin-top: 0;
        }
        
        .detail-section {
          margin-top: 14px;
        }
        
        .detail-section h5 {
          margin: 0 0 6px 0;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .detail-section p {
          margin: 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.5;
        }
        
        .detail-section blockquote {
          margin: 0;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.04);
          border-left: 3px solid rgba(102, 126, 234, 0.5);
          border-radius: 0 8px 8px 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          font-style: italic;
        }
        
        .detail-row {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          font-size: 12px;
        }
        
        .detail-label {
          color: rgba(255, 255, 255, 0.5);
        }
        
        .detail-value {
          color: rgba(255, 255, 255, 0.7);
        }
        
        /* Prompt Configuration Section */
        .prompt-config-section {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.3));
          border: 1px solid rgba(100, 116, 139, 0.25);
          border-radius: 20px;
          margin-bottom: 28px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
        }
        
        .prompt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .prompt-header:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        
        .prompt-header-left {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        
        .prompt-icon {
          font-size: 28px;
        }
        
        .prompt-header h3 {
          margin: 0 0 6px 0;
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
          letter-spacing: -0.02em;
        }
        
        .prompt-header p {
          margin: 0;
          font-size: 14px;
          color: #94a3b8;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
        }
        
        .prompt-toggle-btn {
          width: 36px;
          height: 36px;
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 10px;
          color: #a5b4fc;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .prompt-toggle-btn:hover {
          background: rgba(102, 126, 234, 0.2);
          border-color: rgba(102, 126, 234, 0.3);
        }
        
        .prompt-toggle-btn svg {
          width: 20px;
          height: 20px;
        }
        
        .prompt-editor-container {
          padding: 0 28px 28px;
          border-top: 1px solid rgba(100, 116, 139, 0.15);
        }
        
        .prompt-info-bar {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 18px 20px;
          margin: 20px 0;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.12), rgba(118, 75, 162, 0.08));
          border: 1px solid rgba(102, 126, 234, 0.25);
          border-radius: 14px;
          font-size: 14px;
          color: #cbd5e1;
          line-height: 1.6;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
        }
        
        .info-icon {
          font-size: 20px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .prompt-editor {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(100, 116, 139, 0.2);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .prompt-editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: rgba(30, 41, 59, 0.6);
          border-bottom: 1px solid rgba(100, 116, 139, 0.15);
        }
        
        .prompt-editor-header label {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
          letter-spacing: 0.02em;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
        }
        
        .btn-reset-prompt {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.25);
          border-radius: 8px;
          color: #a5b4fc;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
        }
        
        .btn-reset-prompt:hover {
          background: rgba(102, 126, 234, 0.2);
          border-color: rgba(102, 126, 234, 0.4);
          color: #c7d2fe;
        }
        
        .prompt-textarea {
          width: 100%;
          min-height: 320px;
          padding: 20px;
          background: rgba(15, 23, 42, 0.6);
          border: none;
          color: #f1f5f9;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', monospace;
          font-size: 14px;
          line-height: 1.75;
          resize: vertical;
          letter-spacing: 0.01em;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        
        .prompt-textarea:focus {
          outline: none;
          background: rgba(15, 23, 42, 0.8);
          box-shadow: inset 0 0 0 2px rgba(102, 126, 234, 0.3);
        }
        
        .prompt-textarea::placeholder {
          color: #64748b;
          font-style: italic;
        }
        
        .prompt-textarea::selection {
          background: rgba(102, 126, 234, 0.4);
          color: #fff;
        }
        
        .prompt-editor-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: rgba(30, 41, 59, 0.5);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .char-count {
          font-size: 12px;
          color: #94a3b8;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
          font-weight: 500;
        }
        
        .extraction-targets {
          margin-top: 28px;
        }
        
        .extraction-targets h4 {
          margin: 0 0 16px 0;
          font-size: 15px;
          font-weight: 600;
          color: #e2e8f0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
          letter-spacing: -0.01em;
        }
        
        .targets-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        
        @media (max-width: 768px) {
          .targets-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .target-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.3));
          border: 1px solid rgba(100, 116, 139, 0.2);
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        
        .target-item:hover {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(51, 65, 85, 0.5));
          border-color: rgba(102, 126, 234, 0.3);
          transform: translateY(-1px);
        }
        
        .target-icon {
          font-size: 22px;
          flex-shrink: 0;
        }
        
        .target-item strong {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 3px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
          letter-spacing: -0.01em;
        }
        
        .target-item div > span {
          font-size: 12px;
          color: #94a3b8;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
          line-height: 1.4;
        }
        
        .files-to-analyze {
          margin-top: 28px;
        }
        
        .files-to-analyze h4 {
          margin: 0 0 14px 0;
          font-size: 15px;
          font-weight: 600;
          color: #e2e8f0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
          letter-spacing: -0.01em;
        }
        
        .files-list-compact {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 180px;
          overflow-y: auto;
          padding-right: 4px;
        }
        
        .files-list-compact::-webkit-scrollbar {
          width: 6px;
        }
        
        .files-list-compact::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
          border-radius: 3px;
        }
        
        .files-list-compact::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.5);
          border-radius: 3px;
        }
        
        .files-list-compact::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.7);
        }
        
        .file-item-compact {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(100, 116, 139, 0.15);
          border-radius: 10px;
          transition: all 0.2s ease;
        }
        
        .file-item-compact:hover {
          background: rgba(30, 41, 59, 0.6);
          border-color: rgba(100, 116, 139, 0.25);
        }
        
        .file-item-compact .file-icon {
          font-size: 18px;
          flex-shrink: 0;
        }
        
        .file-item-compact .file-name {
          flex: 1;
          font-size: 14px;
          color: #e2e8f0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
          font-weight: 500;
        }
        
        .file-item-compact .file-size {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          font-family: 'SF Mono', 'Fira Code', 'Menlo', monospace;
        }
        
        .start-analysis-section {
          margin-top: 32px;
          text-align: center;
        }
        
        .btn-start-analysis {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          padding: 22px 56px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 16px;
          color: white;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.35), 0 2px 8px rgba(0, 0, 0, 0.15);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
          letter-spacing: -0.01em;
          position: relative;
          overflow: hidden;
        }
        
        .btn-start-analysis::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }
        
        .btn-start-analysis:hover::before {
          left: 100%;
        }
        
        .btn-start-analysis:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5), 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .btn-start-analysis:active:not(:disabled) {
          transform: translateY(-1px);
        }
        
        .btn-start-analysis:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-start-analysis .btn-icon {
          font-size: 28px;
          margin-bottom: 6px;
        }
        
        .btn-start-analysis .btn-subtitle {
          font-size: 12px;
          font-weight: 500;
          opacity: 0.85;
          margin-top: 6px;
          letter-spacing: 0.02em;
        }
        
        .progress-bar-animated {
          background: linear-gradient(90deg, #667eea, #764ba2, #667eea);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default AIAnalysisStep;
