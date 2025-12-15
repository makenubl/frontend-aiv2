import { useMemo } from 'react';
import { useAuthStore } from '../store/auth.store';

export type UserRole = 'admin' | 'evaluator' | 'reviewer';

// Mirror of backend permissions
export const PERMISSIONS: Record<string, readonly UserRole[]> = {
  // Applications
  'applications:view': ['admin', 'evaluator', 'reviewer'],
  'applications:upload': ['admin', 'evaluator'],
  'applications:delete': ['admin'],
  
  // AI Evaluation
  'evaluation:view': ['admin', 'evaluator', 'reviewer'],
  'evaluation:trigger': ['admin', 'evaluator'],
  'evaluation:refresh': ['admin', 'evaluator'],
  
  // Storage Manager
  'storage:view': ['admin', 'evaluator', 'reviewer'],
  'storage:upload': ['admin', 'evaluator'],
  'storage:delete': ['admin'],
  
  // Chat/AI Assistant
  'chat:access': ['admin', 'evaluator', 'reviewer'],
  
  // Recommendations
  'recommendations:view': ['admin', 'evaluator', 'reviewer'],
  'recommendations:modify': ['admin', 'evaluator'],
  
  // NOC Creation
  'noc:view': ['admin', 'evaluator', 'reviewer'],
  'noc:create': ['admin', 'evaluator'],
  
  // Settings
  'settings:access': ['admin'],
  'users:manage': ['admin'],
};

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(role);
}

/**
 * Hook to get current user's permissions
 */
export function usePermissions() {
  const user = useAuthStore(state => state.user);
  const role = (user?.role || 'reviewer') as UserRole;

  const permissions = useMemo(() => {
    return {
      role,
      isAdmin: role === 'admin',
      isEvaluator: role === 'evaluator',
      isReviewer: role === 'reviewer',
      
      // Applications
      canViewApplications: hasPermission(role, 'applications:view'),
      canUploadApplications: hasPermission(role, 'applications:upload'),
      canDeleteApplications: hasPermission(role, 'applications:delete'),
      
      // AI Evaluation
      canViewEvaluation: hasPermission(role, 'evaluation:view'),
      canTriggerEvaluation: hasPermission(role, 'evaluation:trigger'),
      canRefreshEvaluation: hasPermission(role, 'evaluation:refresh'),
      
      // Storage Manager
      canViewStorage: hasPermission(role, 'storage:view'),
      canUploadFiles: hasPermission(role, 'storage:upload'),
      canDeleteFiles: hasPermission(role, 'storage:delete'),
      
      // Chat/AI Assistant
      canAccessChat: hasPermission(role, 'chat:access'),
      
      // Recommendations
      canViewRecommendations: hasPermission(role, 'recommendations:view'),
      canModifyRecommendations: hasPermission(role, 'recommendations:modify'),
      
      // NOC Creation
      canViewNOC: hasPermission(role, 'noc:view'),
      canCreateNOC: hasPermission(role, 'noc:create'),
      
      // Settings
      canAccessSettings: hasPermission(role, 'settings:access'),
      canManageUsers: hasPermission(role, 'users:manage'),
      
      // Helper function
      can: (permission: Permission) => hasPermission(role, permission),
    };
  }, [role]);

  return permissions;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'evaluator':
      return 'Evaluator';
    case 'reviewer':
      return 'Reviewer';
    default:
      return 'Unknown';
  }
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: UserRole): { bg: string; text: string } {
  switch (role) {
    case 'admin':
      return { bg: 'rgba(220, 38, 38, 0.2)', text: '#ef4444' }; // Red
    case 'evaluator':
      return { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' }; // Blue
    case 'reviewer':
      return { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e' }; // Green
    default:
      return { bg: 'rgba(156, 163, 175, 0.2)', text: '#9ca3af' }; // Gray
  }
}
