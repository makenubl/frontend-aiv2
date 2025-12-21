/**
 * Project Tracker Wizard
 * 
 * Main orchestrating component for the project tracker wizard flow.
 * Manages state across all steps and handles API interactions.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WizardStepper from '../components/wizard/WizardStepper';
import ProjectInfoStep from '../components/wizard/ProjectInfoStep';
import FileUploadStep from '../components/wizard/FileUploadStep';
import AIAnalysisStep from '../components/wizard/AIAnalysisStep';
import TaskAssignmentStep from '../components/wizard/TaskAssignmentStep';
import SummaryStep from '../components/wizard/SummaryStep';
import {
  ProjectInfo,
  UploadedFile,
  ExtractedTask,
  Vendor,
  ExternalEmployee,
  Assignee,
  startWizardSession,
  uploadFiles,
  analyzeFiles,
  getVendors,
  getExternals,
  getAssignees,
  createVendor,
  createExternal,
  finalizeWizard,
} from '../services/projectTracker';

// Wizard steps configuration
const WIZARD_STEPS = [
  { id: 1, title: 'Project Info', description: 'Basic project details' },
  { id: 2, title: 'Upload Files', description: 'Upload documents' },
  { id: 3, title: 'AI Analysis', description: 'Extract tasks' },
  { id: 4, title: 'Assign Tasks', description: 'Assign to team' },
  { id: 5, title: 'Review', description: 'Finalize project' },
];

const ProjectTrackerWizard: React.FC = () => {
  const navigate = useNavigate();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [storageFolderName, setStorageFolderName] = useState<string | null>(null);
  
  // Step 1: Project Info
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    name: '',
    description: '',
    tags: [],
  });
  
  // Step 2: File Upload
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Step 3: AI Analysis
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0, currentFile: '' });
  
  // Step 4: Assignments
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [externalEmployees, setExternalEmployees] = useState<ExternalEmployee[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  
  // Step 5: Finalization
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize wizard session
  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await startWizardSession();
        setSessionId(session.sessionId);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize wizard session');
      }
    };
    initSession();
  }, []);

  // Load vendors and external employees when reaching step 4
  useEffect(() => {
    if (currentStep >= 4) {
      loadAssignees();
    }
  }, [currentStep]);

  const loadAssignees = async () => {
    try {
      const [vendorsList, externalsList] = await Promise.all([
        getVendors(),
        getExternals(),
      ]);
      setVendors(vendorsList);
      setExternalEmployees(externalsList);
      setAssignees(getAssignees(vendorsList, externalsList));
    } catch (err: any) {
      console.error('Failed to load assignees:', err);
    }
  };

  // Step navigation
  const goToStep = (step: number) => {
    if (step <= Math.max(...completedSteps, currentStep)) {
      setCurrentStep(step);
    }
  };

  const markStepComplete = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
    }
  };

  // Step 1 handlers
  const handleProjectInfoNext = async (info: ProjectInfo) => {
    setProjectInfo(info);
    markStepComplete(1);
    setCurrentStep(2);
  };

  const handleProjectInfoCancel = () => {
    navigate('/');
  };

  // Step 2 handlers
  const handleFileUpload = async (files: File[]) => {
    if (!sessionId) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const result = await uploadFiles(sessionId, files, projectInfo.name);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setUploadedFiles(prev => [...prev, ...result.files]);
      
      // Capture the storage folder name for display in summary
      if (result.storageFolderName) {
        setStorageFolderName(result.storageFolderName);
      }
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (err: any) {
      setIsUploading(false);
      setError(err.message || 'Upload failed');
      throw err;
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleFileUploadNext = () => {
    markStepComplete(2);
    setCurrentStep(3);
  };

  const handleFileUploadBack = () => {
    setCurrentStep(1);
  };

  // Step 3 handlers
  const handleStartAnalysis = async () => {
    if (!sessionId) return;
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress({ current: 0, total: uploadedFiles.length, currentFile: 'Preparing AI analysis...' });
    
    try {
      // Set all files to pending/analyzing state first
      setUploadedFiles(prev => prev.map(f => ({
        ...f,
        analysisStatus: 'analyzing' as const,
      })));
      
      // Show processing message - the backend analyzes all files at once
      setAnalysisProgress({
        current: 0,
        total: uploadedFiles.length,
        currentFile: `Analyzing ${uploadedFiles.length} file(s) with AI...`,
      });
      
      console.log('🤖 Starting AI analysis for session:', sessionId);
      
      const result = await analyzeFiles(sessionId, projectInfo.name);
      
      console.log('✅ AI analysis complete:', result.totalTasks, 'tasks found');
      
      // Update all files as completed with their task counts
      setUploadedFiles(prev => prev.map(f => {
        const fileResult = result.results?.find(r => r.fileId === f.id || r.fileName === f.originalName);
        const status: 'pending' | 'analyzing' | 'completed' | 'error' = fileResult?.status === 'error' ? 'error' : 'completed';
        return {
          ...f,
          analysisStatus: status,
          extractedTasksCount: result.tasks.filter(t => t.sourceFile === f.originalName).length,
        };
      }));
      
      setExtractedTasks(result.tasks);
      setAnalysisProgress({
        current: uploadedFiles.length,
        total: uploadedFiles.length,
        currentFile: `Analysis complete - ${result.totalTasks} tasks found`,
      });
    } catch (err: any) {
      console.error('❌ Analysis failed:', err);
      setError(err.message || 'Analysis failed. Please check the console for details.');
      // Mark files as error
      setUploadedFiles(prev => prev.map(f => ({
        ...f,
        analysisStatus: 'error' as const,
      })));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalysisNext = () => {
    markStepComplete(3);
    setCurrentStep(4);
  };

  const handleAnalysisBack = () => {
    setCurrentStep(2);
  };

  // Step 4 handlers
  const handleCreateVendor = async (vendor: Omit<Vendor, '_id' | 'createdAt' | 'status'>) => {
    try {
      // Transform to match API expectations
      const newVendor = await createVendor({
        name: vendor.name,
        contactEmail: vendor.email || vendor.contactEmail || '',
        contactName: vendor.contactName,
        phone: vendor.phone,
        address: vendor.address,
        category: vendor.category || vendor.specialty,
        notes: vendor.notes,
      });
      setVendors(prev => [...prev, newVendor]);
      setAssignees(getAssignees([...vendors, newVendor], externalEmployees));
    } catch (err: any) {
      setError(err.message || 'Failed to create vendor');
    }
  };

  const handleCreateExternal = async (employee: Omit<ExternalEmployee, '_id' | 'createdAt' | 'status'>) => {
    try {
      // Transform to match API expectations
      const newEmployee = await createExternal({
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        organization: employee.organization || employee.company,
        vendorId: employee.vendorId,
        role: employee.role,
        notes: employee.notes,
      });
      setExternalEmployees(prev => [...prev, newEmployee]);
      setAssignees(getAssignees(vendors, [...externalEmployees, newEmployee]));
    } catch (err: any) {
      setError(err.message || 'Failed to create external employee');
    }
  };

  const handleAssignTask = (taskId: string, assigneeId: string, assigneeType: 'vendor' | 'external') => {
    // Find the assignee details from vendors or external employees
    let ownerName = 'Unassigned';
    if (assigneeType === 'vendor') {
      const vendor = vendors.find(v => v._id === assigneeId || v.vendorId === assigneeId);
      ownerName = vendor ? `${vendor.name} (${vendor.company})` : 'Unknown Vendor';
    } else if (assigneeType === 'external') {
      const external = externalEmployees.find(e => e._id === assigneeId || e.externalId === assigneeId);
      ownerName = external ? external.name : 'Unknown External';
    }
    
    setExtractedTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { 
            ...task, 
            assignedTo: assigneeId, 
            assigneeType,
            // Set owner fields for backend persistence
            ownerId: assigneeId,
            ownerName: ownerName,
            ownerType: assigneeType,
          }
        : task
    ));
  };

  const handleUpdateTaskPriority = (taskId: string, priority: 'low' | 'medium' | 'high' | 'critical') => {
    setExtractedTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, priority } : task
    ));
  };

  const handleUpdateTaskDeadline = (taskId: string, deadline: string) => {
    setExtractedTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, deadline } : task
    ));
  };

  const handleAssignmentNext = () => {
    markStepComplete(4);
    setCurrentStep(5);
  };

  const handleAssignmentBack = () => {
    setCurrentStep(3);
  };

  // Step 5 handlers
  const handleFinalize = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await finalizeWizard(sessionId, {
        projectInfo,
        files: uploadedFiles,
        tasks: extractedTasks,
      });
      
      markStepComplete(5);
      
      // Navigate to project detail or dashboard
      navigate(`/project-tracker?project=${result.projectId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummaryBack = () => {
    setCurrentStep(4);
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ProjectInfoStep
            initialData={projectInfo}
            onNext={handleProjectInfoNext}
            onCancel={handleProjectInfoCancel}
          />
        );
      case 2:
        return (
          <FileUploadStep
            sessionId={sessionId || ''}
            uploadedFiles={uploadedFiles}
            onUpload={handleFileUpload}
            onRemoveFile={handleRemoveFile}
            onNext={handleFileUploadNext}
            onBack={handleFileUploadBack}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        );
      case 3:
        return (
          <AIAnalysisStep
            sessionId={sessionId || ''}
            files={uploadedFiles}
            extractedTasks={extractedTasks}
            onStartAnalysis={handleStartAnalysis}
            onNext={handleAnalysisNext}
            onBack={handleAnalysisBack}
            isAnalyzing={isAnalyzing}
            analysisProgress={analysisProgress}
          />
        );
      case 4:
        return (
          <TaskAssignmentStep
            extractedTasks={extractedTasks}
            vendors={vendors}
            externalEmployees={externalEmployees}
            assignees={assignees}
            onCreateVendor={handleCreateVendor}
            onCreateExternal={handleCreateExternal}
            onAssignTask={handleAssignTask}
            onUpdateTaskPriority={handleUpdateTaskPriority}
            onUpdateTaskDeadline={handleUpdateTaskDeadline}
            onNext={handleAssignmentNext}
            onBack={handleAssignmentBack}
          />
        );
      case 5:
        return (
          <SummaryStep
            projectInfo={projectInfo}
            uploadedFiles={uploadedFiles}
            extractedTasks={extractedTasks}
            assignees={assignees}
            storageFolderName={storageFolderName || undefined}
            onFinalize={handleFinalize}
            onBack={handleSummaryBack}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="project-tracker-wizard">
      {/* Background */}
      <div className="wizard-background">
        <div className="bg-gradient-1" />
        <div className="bg-gradient-2" />
        <div className="bg-gradient-3" />
      </div>

      {/* Header */}
      <div className="wizard-header">
        <button className="btn-back-home" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1>
          <span className="header-icon">📊</span>
          New Project
        </h1>
      </div>

      {/* Stepper */}
      <WizardStepper
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Step Content */}
      <div className="wizard-content">
        {renderStepContent()}
      </div>

      <style>{`
        .project-tracker-wizard {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f1a, #1a1a2e);
          position: relative;
          overflow-x: hidden;
        }
        
        .wizard-background {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        
        .bg-gradient-1 {
          position: absolute;
          top: -30%;
          right: -20%;
          width: 60%;
          height: 60%;
          background: radial-gradient(circle, rgba(102, 126, 234, 0.15), transparent 60%);
          animation: float 20s ease-in-out infinite;
        }
        
        .bg-gradient-2 {
          position: absolute;
          bottom: -20%;
          left: -10%;
          width: 50%;
          height: 50%;
          background: radial-gradient(circle, rgba(118, 75, 162, 0.12), transparent 60%);
          animation: float 25s ease-in-out infinite reverse;
        }
        
        .bg-gradient-3 {
          position: absolute;
          top: 40%;
          left: 30%;
          width: 40%;
          height: 40%;
          background: radial-gradient(circle, rgba(17, 153, 142, 0.08), transparent 60%);
          animation: float 30s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        
        .wizard-header {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 24px 40px;
        }
        
        .btn-back-home {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-back-home:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .btn-back-home svg {
          width: 18px;
          height: 18px;
        }
        
        .wizard-header h1 {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }
        
        .header-icon {
          font-size: 28px;
        }
        
        .error-banner {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 40px 20px;
          padding: 14px 20px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          color: #ef4444;
          font-size: 14px;
        }
        
        .error-banner svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }
        
        .error-banner span {
          flex: 1;
        }
        
        .error-banner button {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: #ef4444;
          font-size: 20px;
          cursor: pointer;
          border-radius: 6px;
        }
        
        .error-banner button:hover {
          background: rgba(239, 68, 68, 0.2);
        }
        
        .wizard-content {
          position: relative;
          z-index: 10;
          padding: 0 40px 60px;
        }
        
        @media (max-width: 768px) {
          .wizard-header {
            padding: 16px 20px;
          }
          
          .wizard-content {
            padding: 0 20px 40px;
          }
          
          .error-banner {
            margin: 0 20px 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default ProjectTrackerWizard;
