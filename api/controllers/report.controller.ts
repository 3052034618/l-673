import { Response } from 'express';
import * as reportService from '../services/report.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { filterPlantsByUser } from '../middleware/rbac.middleware.js';
import { db } from '../db/memoryStore.js';

export const generateWeeklyReport = (req: AuthRequest, res: Response) => {
  try {
    const weekEndDate = req.query.weekEndDate as string;
    const report = reportService.generateWeeklyReport(weekEndDate);
    res.status(201).json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getWeeklyReports = (req: AuthRequest, res: Response) => {
  try {
    const plantId = req.query.plantId as string;
    let reports = reportService.getWeeklyReports();
    
    if (plantId) {
      reports = reports.filter(r => r.plantId === plantId);
    }
    
    const accessiblePlants = filterPlantsByUser(req, db.plants);
    const accessiblePlantIds = new Set(accessiblePlants.map((p: any) => p.id));
    reports = reports.filter(r => accessiblePlantIds.has(r.plantId));
    
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getReportById = (req: AuthRequest, res: Response) => {
  try {
    const report = reportService.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: '报告不存在' });
    }
    
    const accessiblePlants = filterPlantsByUser(req, db.plants);
    const accessiblePlantIds = new Set(accessiblePlants.map((p: any) => p.id));
    
    if (!accessiblePlantIds.has(report.plantId)) {
      return res.status(403).json({ error: '无权限访问该报告' });
    }
    
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getLatestReport = (req: AuthRequest, res: Response) => {
  try {
    const plantId = req.query.plantId as string;
    let report;
    
    if (plantId) {
      const accessiblePlants = filterPlantsByUser(req, db.plants);
      const accessiblePlantIds = new Set(accessiblePlants.map((p: any) => p.id));
      
      if (!accessiblePlantIds.has(plantId)) {
        return res.status(403).json({ error: '无权限访问该工厂' });
      }
      
      const reports = reportService.getWeeklyReports().filter(r => r.plantId === plantId);
      report = reports.sort((a, b) => new Date(b.weekEndDate).getTime() - new Date(a.weekEndDate).getTime())[0];
    } else {
      const reports = reportService.getWeeklyReports();
      report = reports.sort((a, b) => new Date(b.weekEndDate).getTime() - new Date(a.weekEndDate).getTime())[0];
    }
    
    if (!report) {
      return res.status(404).json({ error: '暂无报告' });
    }
    
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getStatistics = (req: AuthRequest, res: Response) => {
  try {
    const stats = reportService.getStatistics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
