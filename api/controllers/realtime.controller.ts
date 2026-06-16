import { Response } from 'express';
import * as realtimeService from '../services/realtime.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { checkPlantAccess } from '../middleware/rbac.middleware.js';

export const getCurrentRealtimeData = (req: AuthRequest, res: Response) => {
  try {
    const plantId = req.query.plantId as string;
    const unitId = req.query.unitId as string;
    
    if (plantId && !checkPlantAccess(req, plantId)) {
      return res.status(403).json({ error: '无权限访问该工厂' });
    }
    
    let data = realtimeService.getCurrentRealtimeData(plantId, unitId);
    
    if (!plantId) {
      const { filterPlantsByUser } = require('../middleware/rbac.middleware.js');
      const { db } = require('../db/memoryStore.js');
      const accessiblePlants = filterPlantsByUser(req, db.plants);
      const accessiblePlantIds = new Set(accessiblePlants.map((p: any) => p.id));
      data = data.filter(d => accessiblePlantIds.has(d.plantId));
    }
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getRealtimeHistory = (req: AuthRequest, res: Response) => {
  try {
    const { plantId } = req.params;
    const { startDate, endDate, unitId } = req.query;
    
    if (!checkPlantAccess(req, plantId)) {
      return res.status(403).json({ error: '无权限访问该工厂' });
    }
    
    const data = realtimeService.getRealtimeHistory(
      plantId,
      startDate as string,
      endDate as string,
      unitId as string
    );
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAggregatedData = (req: AuthRequest, res: Response) => {
  try {
    const plantId = req.query.plantId as string;
    const period = (req.query.period as any) || 'day';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    if (!plantId) {
      return res.status(400).json({ error: '缺少plantId参数' });
    }
    
    if (!checkPlantAccess(req, plantId)) {
      return res.status(403).json({ error: '无权限访问该工厂' });
    }
    
    const data = realtimeService.getAggregatedData(plantId, period, startDate, endDate);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPlantSummary = (req: AuthRequest, res: Response) => {
  try {
    const { plantId } = req.params;
    
    if (!checkPlantAccess(req, plantId)) {
      return res.status(403).json({ error: '无权限访问该工厂' });
    }
    
    const summary = realtimeService.getPlantSummary(plantId);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const addRealtimeData = (req: AuthRequest, res: Response) => {
  try {
    const data = realtimeService.addRealtimeData(req.body);
    res.status(201).json(data);
  } catch (error: any) {    res.status(400).json({ error: error.message });
  }
};
