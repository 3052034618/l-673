import { Response } from 'express';
import * as forecastService from '../services/forecast.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { checkPlantAccess, filterPlantsByUser } from '../middleware/rbac.middleware.js';
import { db } from '../db/memoryStore.js';

export const uploadSupplyPlan = async (req: AuthRequest, res: Response) => {
  try {
    const plantId = req.query.plantId as string;
    
    if (!plantId) {
      return res.status(400).json({ error: '缺少plantId参数' });
    }
    
    if (!checkPlantAccess(req, plantId)) {
      return res.status(403).json({ error: '无权限操作该工厂' });
    }
    
    if (!req.body || !req.body.fileData) {
      return res.status(400).json({ error: '缺少Excel文件数据' });
    }
    
    const fileData = Buffer.from(req.body.fileData, 'base64');
    const result = await forecastService.parseSupplyPlanExcel(fileData, plantId);
    
    res.json({
      success: true,
      regions: result.regions,
      summary: result.summary
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getGapForecast = (req: AuthRequest, res: Response) => {
  try {
    const plantId = req.query.plantId as string;
    const region = req.query.region as string;
    
    if (!plantId) {
      return res.status(400).json({ error: '缺少plantId参数' });
    }
    
    if (!checkPlantAccess(req, plantId)) {
      return res.status(403).json({ error: '无权限访问该工厂' });
    }
    
    const forecast = forecastService.getGapForecast(plantId, region);
    res.json(forecast);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getOptimalTransportPlan = (req: AuthRequest, res: Response) => {
  try {
    const plantId = req.query.plantId as string;
    const targetDate = req.query.targetDate as string;
    
    if (!plantId) {
      return res.status(400).json({ error: '缺少plantId参数' });
    }
    
    if (!checkPlantAccess(req, plantId)) {
      return res.status(403).json({ error: '无权限访问该工厂' });
    }
    
    const plan = forecastService.getOptimalTransportPlan(plantId, targetDate);
    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getStandbyBoilerRecommendation = (req: AuthRequest, res: Response) => {
  try {
    const plantId = req.query.plantId as string;
    
    if (!plantId) {
      return res.status(400).json({ error: '缺少plantId参数' });
    }
    
    if (!checkPlantAccess(req, plantId)) {
      return res.status(403).json({ error: '无权限访问该工厂' });
    }
    
    const recommendation = forecastService.getStandbyBoilerRecommendation(plantId);
    res.json(recommendation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getForecastHistory = (req: AuthRequest, res: Response) => {
  try {
    let history = forecastService.getForecastHistory();
    
    const accessiblePlants = filterPlantsByUser(req, db.plants);
    const accessiblePlantIds = new Set(accessiblePlants.map((p: any) => p.id));
    history = history.filter(h => accessiblePlantIds.has(h.plantId));
    
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
