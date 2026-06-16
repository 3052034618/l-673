import request from './request';
import type { Approval, ApprovalStatus, ApprovalRole } from '../../shared/types';

export const getApprovals = (params?: {
  status?: ApprovalStatus;
  role?: ApprovalRole;
  limit?: number;
}): Promise<Approval[]> => {
  return request.get('/approvals', { params });
};

export const getApprovalById = (id: string): Promise<Approval> => {
  return request.get(`/approvals/${id}`);
};

export const getApprovalsByPlant = (plantId: string): Promise<Approval[]> => {
  return request.get(`/approvals/plant/${plantId}`);
};

export const approveStep = (
  approvalIdOrParams: string | {
    approvalId: string;
    step: number;
    approverId: string;
    approverName: string;
    comment?: string;
  },
  role?: string,
  comment?: string
): Promise<Approval> => {
  if (typeof approvalIdOrParams === 'string') {
    return request.post(`/approvals/${approvalIdOrParams}/approve`, {
      approvalId: approvalIdOrParams,
      role,
      comment
    });
  }
  return request.post(`/approvals/${approvalIdOrParams.approvalId}/approve`, approvalIdOrParams);
};

export const rejectApproval = (
  approvalIdOrParams: string | {
    approvalId: string;
    step: number;
    approverId: string;
    approverName: string;
    comment: string;
    reason: string;
  },
  role?: string,
  comment?: string
): Promise<Approval> => {
  if (typeof approvalIdOrParams === 'string') {
    return request.post(`/approvals/${approvalIdOrParams}/reject`, {
      approvalId: approvalIdOrParams,
      role,
      comment
    });
  }
  return request.post(`/approvals/${approvalIdOrParams.approvalId}/reject`, approvalIdOrParams);
};

export const getPendingCount = (role: ApprovalRole): Promise<{ count: number }> => {
  return request.get(`/approvals/pending/count?role=${role}`);
};
