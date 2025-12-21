/**
 * Wizard Stepper Component
 * 
 * Displays step navigation for the project tracker wizard
 * with progress indicators and step status
 */

import React from 'react';

export interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon?: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (stepId: number) => void;
}

// Default icons for steps
const DEFAULT_ICONS: Record<number, string> = {
  1: '📋',
  2: '📁',
  3: '🤖',
  4: '👥',
  5: '✨',
};

export const WizardStepper: React.FC<WizardStepperProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}) => {
  const getStepStatus = (stepId: number): 'completed' | 'current' | 'upcoming' => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  const canNavigateToStep = (stepId: number): boolean => {
    // Can navigate to completed steps or current step
    return completedSteps.includes(stepId) || stepId === currentStep || stepId === currentStep - 1;
  };
  
  const getStepIcon = (step: WizardStep): string => {
    return step.icon || DEFAULT_ICONS[step.id] || '📌';
  };

  return (
    <div className="wizard-stepper">
      <div className="wizard-stepper-container">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isClickable = onStepClick && canNavigateToStep(step.id);
          
          return (
            <React.Fragment key={step.id}>
              <div
                className={`wizard-step ${status} ${isClickable ? 'clickable' : ''}`}
                onClick={() => isClickable && onStepClick(step.id)}
              >
                <div className="wizard-step-indicator">
                  {status === 'completed' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="wizard-step-icon">{getStepIcon(step)}</span>
                  )}
                </div>
                <div className="wizard-step-content">
                  <span className="wizard-step-title">{step.title}</span>
                  <span className="wizard-step-description">{step.description}</span>
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`wizard-step-connector ${completedSteps.includes(step.id) ? 'completed' : ''}`}>
                  <div className="wizard-step-connector-line" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      <style>{`
        .wizard-stepper {
          padding: 24px 32px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .wizard-stepper-container {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 0;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .wizard-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 16px;
          transition: all 0.3s ease;
          min-width: 140px;
        }
        
        .wizard-step.clickable {
          cursor: pointer;
        }
        
        .wizard-step.clickable:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        
        .wizard-step-indicator {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          transition: all 0.3s ease;
          position: relative;
        }
        
        .wizard-step.upcoming .wizard-step-indicator {
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.4);
        }
        
        .wizard-step.current .wizard-step-indicator {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: 2px solid transparent;
          color: white;
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .wizard-step.completed .wizard-step-indicator {
          background: linear-gradient(135deg, #11998e, #38ef7d);
          border: 2px solid transparent;
          color: white;
        }
        
        .wizard-step.completed .wizard-step-indicator svg {
          width: 28px;
          height: 28px;
        }
        
        .wizard-step-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
        }
        
        .wizard-step-title {
          font-size: 14px;
          font-weight: 600;
          transition: color 0.3s ease;
        }
        
        .wizard-step.upcoming .wizard-step-title {
          color: rgba(255, 255, 255, 0.4);
        }
        
        .wizard-step.current .wizard-step-title {
          color: rgba(255, 255, 255, 0.95);
        }
        
        .wizard-step.completed .wizard-step-title {
          color: rgba(255, 255, 255, 0.8);
        }
        
        .wizard-step-description {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          max-width: 120px;
        }
        
        .wizard-step-connector {
          flex: 1;
          display: flex;
          align-items: center;
          padding: 0 8px;
          margin-top: 28px;
          min-width: 40px;
          max-width: 80px;
        }
        
        .wizard-step-connector-line {
          height: 3px;
          width: 100%;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 2px;
          transition: background 0.3s ease;
        }
        
        .wizard-step-connector.completed .wizard-step-connector-line {
          background: linear-gradient(90deg, #11998e, #38ef7d);
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);
          }
          50% {
            box-shadow: 0 0 30px rgba(102, 126, 234, 0.6), 0 0 40px rgba(118, 75, 162, 0.3);
          }
        }
        
        @media (max-width: 900px) {
          .wizard-stepper-container {
            flex-wrap: wrap;
            gap: 8px;
          }
          
          .wizard-step {
            min-width: 100px;
            padding: 12px 8px;
          }
          
          .wizard-step-indicator {
            width: 44px;
            height: 44px;
            font-size: 18px;
          }
          
          .wizard-step-connector {
            display: none;
          }
          
          .wizard-step-description {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default WizardStepper;
