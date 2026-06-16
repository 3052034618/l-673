import { Response } from 'express';
import * as approvalService from '../services/approval.service.js';
import * as alertService from '../services/alert.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { checkPlantAccess, filterPlantsByUser } from '../middleware/rbac.middleware.js';
import { z } from 'zod';
import { db } from '../db/memoryStore.js';
import type { ApprovalRole } from '../../shared/types.js';

const approveSchema = z.object({
  step: z.number().min(1).max(3),
  comment: z.string().optional()
});

const rejectSchema = z.object({
  step: z.number().min(1).max(3),
  comment: z.string().min(1, '请填写审批意见'),
  reason: z.string().min(1, '请填写拒绝原因')
});

const createApprovalSchema = z.object({
  alertId: z.string().optional(),
  plantId: z.string().min(1, '缺少工厂ID'),
  type: z.enum(['parameter_adjust', 'shutdown']),
  requesterName: z.string().min(1, '缺少申请人姓名')
});

export const getAllApprovals = (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as any;
    const role = req.query.role as ApprovalRole;
    
    let approvals = approvalService.getAllApprovals(status, role);
    
    const accessiblePlants = filterPlantsByUser(req, db.plants);
    const accessiblePlantIds = new Set(accessiblePlants.map((p: any) => p.id));
    approvals = approvals.filter(a => accessiblePlantIds.has(a.plantId));
    
    res.json(approvals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getApprovalById = (req: AuthRequest, res: Response) => {
  try {
    const approval = approvalService.getApprovalById(req.params.id);
    if (!approval) {
      return res.status(404).json({ error: '审批不存在' });
    }
    
    if (!checkPlantAccess(req, approval.plantId)) {
      return res.status(403).json({ error: '无权限访问该审批' });
    }
    
    res.json(approval);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getApprovalsByPlant = (req: AuthRequest, res: Response) => {
  try {
    const { plantId } = req.params;
    
    if (!checkPlantAccess(req, plantId)) {
      return res.status(403).json({ error: '无权限访问该工厂' });
    }
    
    const approvals = approvalService.getApprovalsByPlant(plantId);
    res.json(approvals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createApproval = (req: AuthRequest, res: Response) => {
  try {
    const validated = createApprovalSchema.parse(req.body);
    
    if (!checkPlantAccess(req, validated.plantId)) {
      return res.status(403).json({ error: '无权限操作该工厂' });
    }
    
    const approval = approvalService.createApproval(
      validated.alertId,
      validated.plantId,
      validated.type,
      validated.requesterName
    );
    
    if (validated.alertId) {
      alertService.escalateAlert(validated.alertId);
    }
    
    res.status(201).json(approval);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const approveStep = (req: AuthRequest, res: Response) => {
  try {
    const validated = approveSchema.parse(req.body);
    const approval = approvalService.getApprovalById(req.params.id);
    
    if (!approval) {
      return res.status(404).json({ error: '审批不存在' });
    }
    
    if (!checkPlantAccess(req, approval.plantId)) {
      return res.status(403).json({ error: '无权限操作该审批' });
    }
    
    if (!req.user) {
      return res.status(401).json({ error: '未登录' });
    }
    
    const roleStepMap: Record<string, number> = {
      'shift_supervisor': 1,
      'plant_manager': 2,
      'epb': 3
    };
    
    const userStep = roleStepMap[req.user.role];
    if (userStep !== validated.step) {
      return res.status(403).json({ error: '您的角色无法执行此步骤的审批' });
    }
    
    const result = approvalService.approveStep(
      req.params.id,
      validated.step,
      req.user.id,
      req.user.name,
      validated.comment
    );
    
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const rejectApproval = (req: AuthRequest, res: Response) => {
  try {
    const validated = rejectSchema.parse(req.body);
    const approval = approvalService.getApprovalById(req.params.id);
    
    if (!approval) {
      return res.status(404).json({ error: '审批不存在' });
    }
    
    if (!checkPlantAccess(req, approval.plantId)) {
      return res.status(403).json({ error: '无权限操作该审批' });
    }
    
    if (!req.user) {
      return res.status(401).json({ error: '未登录' });
    }
    
    const roleStepMap: Record<string, number> = {
      'shift_supervisor': 1,
      'plant_manager': 2,
      'epb': 3
    };
    
    const userStep = roleStepMap[req.user.role];
    if (userStep !== validated.step) {
      return res.status(403).json({ error: '您的角色无法执行此步骤的审批' });
    }
    
    const result = approvalService.rejectApproval(
      req.params.id,
      validated.step,
      req.user.id,
      req.user.name,
      validated.comment,
      validated.reason
    );
    
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const getPendingCount = (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未登录' });
    }
    
    const role = req.user.role as ApprovalRole;
    const validRoles: ApprovalRole[] = ['shift_supervisor', 'plant_manager', 'epb'];
    
    if (!validRoles.includes(role)) {
      return res.json({ count: 0 });
    }
    
    let count = approvalService.getPendingCount(role);
    
    const accessiblePlants = filterPlantsByUser(req, db.plants);
    const accessiblePlantIds = new Set(accessiblePlants.map((p: any) => p.id));
    
    const allPending = approvalService.getAllApprovals(undefined, role);
    count = allPending.filter(a => accessiblePlantIds.has(a.plantId)).length;
    
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getApprovalHistory = (req: AuthRequest, res: Response) => {
  try {
    const plantId = req.query.plantId as string;
    
    if (plantId && !checkPlantAccess(req, plantId)) {
      return res.status(403).json({ error: '无权限访问该工厂' });
    }
    
    let history = approvalService.getApprovalHistory(plantId);
    
    if (!plantId) {
      const accessiblePlants = filterPlantsByUser(req, db.plants);
      const accessiblePlantIds = new Set(accessiblePlants.map((p: any) => p.id));
      history = history.filter(a => accessiblePlantIds.has(a.plantId));
    }
    
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
