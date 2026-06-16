import { Response } from 'express';
import * as plantService from '../services/plant.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { filterPlantsByUser, checkPlantAccess } from '../middleware/rbac.middleware.js';
import { z } from 'zod';

const createPlantSchema = z.object({
  name: z.string().min(1, '工厂名称不能为空'),
  province: z.string().min(1, '省份不能为空'),
  city: z.string().min(1, '城市不能为空'),
  address: z.string().optional(),
  capacity: z.number().min(1, '日处理能力必须大于0'),
  status: z.enum(['running', 'stopped', 'maintenance']).default('running'),
  lng: z.number().optional(),
  lat: z.number().optional(),
  units: z.array(z.object({
    name: z.string(),
    capacity: z.number(),
    status: z.enum(['running', 'stopped', 'standby'])
  })).default([])
});

export const getAllPlants = (req: AuthRequest, res: Response) => {
  try {
    const province = req.query.province as string;
    let plants = plantService.getAllPlants();
    
    if (province) {
      plants = plants.filter(p => p.province === province);
    }
    
    plants = filterPlantsByUser(req, plants);
    res.json(plants);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPlantById = (req: AuthRequest, res: Response) => {
  try {
    const plant = plantService.getPlantById(req.params.id);
    if (!plant) {
      return res.status(404).json({ error: '工厂不存在' });
    }
    
    if (!checkPlantAccess(req, plant.id)) {
      return res.status(403).json({ error: '无权限访问该工厂' });
    }
    
    res.json(plant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPlantsByProvince = (req: AuthRequest, res: Response) => {
  try {
    const province = req.params.province;
    let plants = plantService.getPlantsByProvince(province);
    plants = filterPlantsByUser(req, plants);
    res.json(plants);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProvinceStats = (req: AuthRequest, res: Response) => {
  try {
    const stats = plantService.getProvinceStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPlantRanking = (req: AuthRequest, res: Response) => {
  try {
    const metric = (req.query.metric as 'powerPerTon' | 'complianceRate' | 'availabilityRate') || 'powerPerTon';
    const rankings = plantService.getPlantRanking(metric);
    res.json(rankings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createPlant = (req: AuthRequest, res: Response) => {
  try {
    const validated = createPlantSchema.parse(req.body);
    const plant = plantService.createPlant(validated);
    res.status(201).json(plant);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const updatePlant = (req: AuthRequest, res: Response) => {
  try {
    if (!checkPlantAccess(req, req.params.id)) {
      return res.status(403).json({ error: '无权限操作该工厂' });
    }
    const plant = plantService.updatePlant(req.params.id, req.body);
    res.json(plant);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deletePlant = (req: AuthRequest, res: Response) => {
  try {
    if (!checkPlantAccess(req, req.params.id)) {
      return res.status(403).json({ error: '无权限操作该工厂' });
    }
    plantService.deletePlant(req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const addUnit = (req: AuthRequest, res: Response) => {
  try {
    if (!checkPlantAccess(req, req.params.plantId)) {
      return res.status(403).json({ error: '无权限操作该工厂' });
    }
    const unit = plantService.addUnit(req.params.plantId, req.body);
    res.status(201).json(unit);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateUnit = (req: AuthRequest, res: Response) => {
  try {
    const unit = plantService.updateUnit(req.params.unitId, req.body);
    res.json(unit);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
