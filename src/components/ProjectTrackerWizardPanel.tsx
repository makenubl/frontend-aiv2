/**
 * Project Tracker Wizard Panel
 * 
 * Embedded version of the project tracker wizard that works within the dashboard layout.
 * Shows sidebar and header by not taking full screen.
 */

import React, { useState, useEffect } from 'react';
import WizardStepper from './wizard/WizardStepper';
import ProjectInfoStep from './wizard/ProjectInfoStep';
import FileUploadStep from './wizard/FileUploadStep';
import AIAnalysisStep from './wizard/AIAnalysisStep';
import TaskAssignmentStep from './wizard/TaskAssignmentStep';
import SummaryStep from './wizard/SummaryStep';
import { storageApi } from '../services/api';
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

interface ProjectTrackerWizardPanelProps {
  onBack: () => void;
  onComplete?: (projectId: string) => void;
}

const ProjectTrackerWizardPanel: React.FC<ProjectTrackerWizardPanelProps> = ({ onBack, onComplete }) => {
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
    
    // If user selected an existing project, load its existing files
    if ((info as any).isExisting && (info as any).existingFolderName) {
      const folderName = (info as any).existingFolderName;
      console.log('📁 Selected existing project:', folderName);
      setStorageFolderName(folderName);
      
      try {
        // First, get file list from storage
        const response = await storageApi.listFiles(folderName);
        const existingFilesWithMeta = response.data.filesWithMetadata || [];
        const existingFileNames = response.data.files || [];
        
        // Prepare files data for loading into wizard session
        let filesToLoad: Array<{ name: string; size?: number; mimeType?: string; s3Key?: string }>;
        
        if (existingFilesWithMeta.length > 0) {
          filesToLoad = existingFilesWithMeta.map((file: any) => ({
            name: file.name,
            size: file.size,
            mimeType: file.mimeType,
            s3Key: file.s3Key,
          }));
        } else {
          filesToLoad = existingFileNames.map((fileName: string) => ({
            name: fileName,
          }));
        }
        
        if (filesToLoad.length > 0 && sessionId) {
          console.log(`📄 Loading ${filesToLoad.length} files into wizard session...`);
          
          // Load files into the backend wizard session (downloads from S3 and extracts text)
          const { loadExistingFiles } = await import('../services/projectTracker');
          const loadResult = await loadExistingFiles(sessionId, folderName, filesToLoad);
          
          // Convert loaded files to UploadedFile format for UI
          const uploadedFilesData: UploadedFile[] = loadResult.loadedFiles.map((file: any) => ({
            id: file.id,
            originalName: file.originalName,
            filename: file.originalName,
            mimeType: file.mimeType || 'application/octet-stream',
            size: file.size || 0,
            uploadedAt: file.uploadedAt || new Date().toISOString(),
            status: 'uploaded' as const,
            analysisStatus: 'pending' as const,
          }));
          
          setUploadedFiles(uploadedFilesData);
          console.log(`✅ Loaded ${uploadedFilesData.length} files from ${folderName} into wizard session`);
          
          if (loadResult.errors?.length > 0) {
            console.warn('⚠️ Some files failed to load:', loadResult.errors);
          }
        } else {
          console.log('📄 No files to load from existing project');
        }
      } catch (err) {
        console.error('Failed to load existing files:', err);
        setError('Failed to load existing files from storage');
      }
    }
    
    setCurrentStep(2);
  };

  const handleProjectInfoCancel = () => {
    onBack();
  };

  // Step 2 handlers
  const handleFileUpload = async (files: File[]) => {
    if (!sessionId) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      // Use existing folder name if available, otherwise use project name
      const folderName = storageFolderName || projectInfo.name;
      const result = await uploadFiles(sessionId, files, folderName);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setUploadedFiles(prev => [...prev, ...result.files]);
      
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
  const handleStartAnalysis = async (customPrompt?: string) => {
    if (!sessionId) return;
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress({ current: 0, total: uploadedFiles.length, currentFile: 'Preparing AI analysis...' });
    
    try {
      setUploadedFiles(prev => prev.map(f => ({
        ...f,
        analysisStatus: 'analyzing' as const,
      })));
      
      setAnalysisProgress({
        current: 0,
        total: uploadedFiles.length,
        currentFile: `Analyzing ${uploadedFiles.length} file(s) with AI...`,
      });
      
      console.log('🤖 Starting AI analysis for session:', sessionId);
      if (customPrompt) {
        console.log('📝 Using custom prompt');
      }
      
      const result = await analyzeFiles(sessionId, projectInfo.name, customPrompt);
      
      console.log('✅ AI analysis complete:', result.totalTasks, 'tasks found');
      
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
    // Look up the assignee details to get the name
    let ownerName = 'Unassigned';
    if (assigneeType === 'vendor') {
      const vendor = vendors.find(v => v._id === assigneeId || v.vendorId === assigneeId);
      ownerName = vendor?.name || 'Unknown Vendor';
    } else {
      const external = externalEmployees.find(e => e._id === assigneeId || e.externalId === assigneeId);
      ownerName = external?.name || 'Unknown External';
    }
    
    setExtractedTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { 
            ...task, 
            assignedTo: assigneeId, 
            assigneeType,
            ownerId: assigneeId,
            ownerName,
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
      // Check if this is an existing project or a new one
      const isExisting = (projectInfo as any).isExisting;
      const existingProjectId = (projectInfo as any).existingProjectId;
      
      const result = await finalizeWizard(sessionId, {
        projectInfo,
        files: uploadedFiles,
        tasks: extractedTasks,
        existingProjectId: isExisting ? existingProjectId : undefined,
      });
      
      markStepComplete(5);
      
      if (onComplete) {
        onComplete(result.projectId || existingProjectId);
      } else {
        onBack();
      }
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
    <div className="wizard-panel">
      {/* Panel Header */}
      <div className="wizard-panel-header">
        <button className="btn-back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Storage
        </button>
        <h1>
          <span className="header-icon">📊</span>
          New Project
        </h1>
        <div className="header-spacer" />
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Step Content */}
      <div className="wizard-panel-content">
        {renderStepContent()}
      </div>

      <style>{`
        .wizard-panel {
          min-height: 100%;
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          display: flex;
          flex-direction: column;
        }
        
        .wizard-panel-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          background: rgba(15, 23, 42, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        .btn-back {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-back:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        .wizard-panel-header h1 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }
        
        .header-icon {
          font-size: 24px;
        }
        
        .header-spacer {
          flex: 1;
        }
        
        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 16px 24px;
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          color: #ef4444;
          font-size: 13px;
        }
        
        .error-banner span {
          flex: 1;
        }
        
        .error-banner button {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: #ef4444;
          font-size: 18px;
          cursor: pointer;
          border-radius: 4px;
        }
        
        .error-banner button:hover {
          background: rgba(239, 68, 68, 0.2);
        }
        
        .wizard-panel-content {
          flex: 1;
          padding: 0 24px 32px;
          overflow-y: auto;
        }
        
        @media (max-width: 768px) {
          .wizard-panel-header {
            padding: 12px 16px;
          }
          
          .wizard-panel-header h1 {
            font-size: 16px;
          }
          
          .wizard-panel-content {
            padding: 0 16px 24px;
          }
          
          .error-banner {
            margin: 12px 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default ProjectTrackerWizardPanel;
