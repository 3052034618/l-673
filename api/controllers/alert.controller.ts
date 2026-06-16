import { Response } from 'express';
import * as alertService from '../services/alert.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { checkPlantAccess, filterPlantsByUser } from '../middleware/rbac.middleware.js';
import { z } from 'zod';
import { db } from '../db/memoryStore.js';

const acknowledgeSchema = z.object({
  handlerNote: z.string().optional()
});

const resolveSchema = z.object({
  resolutionNote: z.string().min(1, '请填写处理说明')
});

export const getAllAlerts = (req: AuthRequest, res: Response) => {
  try {
    const plantId = req.query.plantId as string;
    const level = req.query.level as any;
    const status = req.query.status as any;
    
    if (plantId && !checkPlantAccess(req, plantId)) {
      return res.status(403).json({ error: '无权限访问该工厂' });
    }
    
    let alerts = alertService.getAllAlerts(plantId, level, status);
    
    if (!plantId) {
      const accessiblePlants = filterPlantsByUser(req, db.plants);
      const accessiblePlantIds = new Set(accessiblePlants.map((p: any) => p.id));
      alerts = alerts.filter(a => accessiblePlantIds.has(a.plantId));
    }
    
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAlertById = (req: AuthRequest, res: Response) => {
  try {
    const alert = alertService.getAlertById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: '预警不存在' });
    }
    
    if (!checkPlantAccess(req, alert.plantId)) {
      return res.status(403).json({ error: '无权限访问该预警' });
    }
    
    res.json(alert);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const acknowledgeAlert = (req: AuthRequest, res: Response) => {
  try {
    const validated = acknowledgeSchema.parse(req.body);
    const alert = alertService.getAlertById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ error: '预警不存在' });
    }
    
    if (!checkPlantAccess(req, alert.plantId)) {
      return res.status(403).json({ error: '无权限操作该预警' });
    }
    
    if (!req.user) {
      return res.status(401).json({ error: '未登录' });
    }
    
    const result = alertService.acknowledgeAlert(req.params.id, req.user.id, validated.handlerNote);
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const resolveAlert = (req: AuthRequest, res: Response) => {
  try {
    const validated = resolveSchema.parse(req.body);
    const alert = alertService.getAlertById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ error: '预警不存在' });
    }
    
    if (!checkPlantAccess(req, alert.plantId)) {
      return res.status(403).json({ error: '无权限操作该预警' });
    }
    
    const result = alertService.resolveAlert(req.params.id, validated.resolutionNote);
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const escalateAlert = (req: AuthRequest, res: Response) => {
  try {
    const alert = alertService.getAlertById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ error: '预警不存在' });
    }
    
    if (!checkPlantAccess(req, alert.plantId)) {
      return res.status(403).json({ error: '无权限操作该预警' });
    }
    
    const result = alertService.escalateAlert(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getActiveAlertsCount = (req: AuthRequest, res: Response) => {
  try {
    const plantId = req.query.plantId as string;
    
    if (plantId && !checkPlantAccess(req, plantId)) {
      return res.status(403).json({ error: '无权限访问该工厂' });
    }
    
    let count: number;
    if (plantId) {
      count = alertService.getActiveAlertsCount(plantId);
    } else {
      const accessiblePlants = filterPlantsByUser(req, db.plants);
      count = accessiblePlants.reduce((sum: number, p: any) => 
        sum + alertService.getActiveAlertsCount(p.id), 0);
    }
    
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
