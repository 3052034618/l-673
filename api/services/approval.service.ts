import { db, generateId } from '../db/memoryStore.js';
import type { 
  Approval, 
  ApprovalType, 
  ApprovalStatus, 
  ApprovalRole,
  StepStatus 
} from '../../shared/types.js';

export const getAllApprovals = (
  status?: ApprovalStatus,
  role?: ApprovalRole
): Approval[] => {
  let approvals = [...db.approvals];
  
  if (status) {
    approvals = approvals.filter(a => a.status === status);
  }
  
  if (role) {
    const roleStepMap: Record<ApprovalRole, number> = {
      'shift_supervisor': 1,
      'plant_manager': 2,
      'epb': 3
    };
    const targetStep = roleStepMap[role];
    approvals = approvals.filter(a => a.currentStep === targetStep && a.status !== 'approved' && a.status !== 'rejected');
  }
  
  return approvals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getApprovalById = (id: string): Approval | undefined => {
  return db.approvals.find(a => a.id === id);
};

export const getApprovalsByPlant = (plantId: string): Approval[] => {
  return db.approvals
    .filter(a => a.plantId === plantId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const createApproval = (
  alertId: string | undefined,
  plantId: string,
  type: ApprovalType,
  requesterName: string
): Approval => {
  const now = new Date();
  
  const steps = [
    {
      id: generateId(),
      step: 1,
      role: 'shift_supervisor' as const,
      status: 'pending' as StepStatus
    },
    {
      id: generateId(),
      step: 2,
      role: 'plant_manager' as const,
      status: 'pending' as StepStatus
    },
    {
      id: generateId(),
      step: 3,
      role: 'epb' as const,
      status: 'pending' as StepStatus
    }
  ];
  
  const newApproval: Approval = {
    id: generateId(),
    alertId,
    plantId,
    type,
    status: 'pending_shift',
    currentStep: 1,
    steps,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
  
  db.approvals.unshift(newApproval);
  
  return newApproval;
};

export const approveStep = (
  approvalId: string,
  step: number,
  approverId: string,
  approverName: string,
  comment?: string
): Approval => {
  const approval = db.approvals.find(a => a.id === approvalId);
  if (!approval) {
    throw new Error('审批不存在');
  }
  
  if (approval.status === 'approved' || approval.status === 'rejected') {
    throw new Error('审批已完成，无法继续操作');
  }
  
  const stepIndex = approval.steps.findIndex(s => s.step === step);
  if (stepIndex === -1) {
    throw new Error('审批步骤不存在');
  }
  
  if (approval.currentStep !== step) {
    throw new Error('当前步骤不匹配');
  }
  
  const roleStepMap: Record<string, number> = {
    'shift_supervisor': 1,
    'plant_manager': 2,
    'epb': 3
  };
  
  const stepRole = approval.steps[stepIndex].role;
  if (roleStepMap[stepRole] !== step) {
    throw new Error('角色权限不匹配');
  }
  
  approval.steps[stepIndex] = {
    ...approval.steps[stepIndex],
    status: 'approved',
    approverId,
    approverName,
    comment,
    approvedAt: new Date().toISOString()
  };
  
  if (step < 3) {
    approval.currentStep = step + 1;
    const nextStatusMap: Record<number, ApprovalStatus> = {
      1: 'pending_manager',
      2: 'pending_epb'
    };
    approval.status = nextStatusMap[step];
  } else {
    approval.currentStep = 4;
    approval.status = 'approved';
  }
  
  approval.updatedAt = new Date().toISOString();
  
  return approval;
};

export const rejectApproval = (
  approvalId: string,
  step: number,
  approverId: string,
  approverName: string,
  comment: string,
  reason: string
): Approval => {
  const approval = db.approvals.find(a => a.id === approvalId);
  if (!approval) {
    throw new Error('审批不存在');
  }
  
  if (approval.status === 'approved' || approval.status === 'rejected') {
    throw new Error('审批已完成，无法继续操作');
  }
  
  const stepIndex = approval.steps.findIndex(s => s.step === step);
  if (stepIndex === -1) {
    throw new Error('审批步骤不存在');
  }
  
  if (approval.currentStep !== step) {
    throw new Error('当前步骤不匹配');
  }
  
  approval.steps[stepIndex] = {
    ...approval.steps[stepIndex],
    status: 'rejected',
    approverId,
    approverName,
    comment: `${comment}\n拒绝原因：${reason}`,
    approvedAt: new Date().toISOString()
  };
  
  approval.status = 'rejected';
  approval.updatedAt = new Date().toISOString();
  
  return approval;
};

export const getPendingCount = (role: ApprovalRole): number => {
  const roleStepMap: Record<ApprovalRole, number> = {
    'shift_supervisor': 1,
    'plant_manager': 2,
    'epb': 3
  };
  
  const targetStep = roleStepMap[role];
  
  return db.approvals.filter(a => 
    a.currentStep === targetStep && 
    a.status !== 'approved' && 
    a.status !== 'rejected'
  ).length;
};

export const getApprovalHistory = (plantId?: string): Approval[] => {
  let approvals = db.approvals.filter(a => 
    a.status === 'approved' || a.status === 'rejected'
  );
  
  if (plantId) {
    approvals = approvals.filter(a => a.plantId === plantId);
  }
  
  return approvals.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};
