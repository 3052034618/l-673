import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import type { UserRole } from '../../shared/types.js';

interface PermissionConfig {
  roles: UserRole[];
  permissions?: string[];
  allowOwnPlant?: boolean;
  allowOwnRegion?: boolean;
}

export const requireRole = (config: PermissionConfig) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: '未登录' });
    }
    
    if (!config.roles.includes(user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    if (config.permissions && config.permissions.length > 0) {
      const hasPermission = config.permissions.some(p => 
        user.permissions.includes(p) || user.permissions.includes('all')
      );
      if (!hasPermission) {
        return res.status(403).json({ error: '权限不足' });
      }
    }
    
    next();
  };
};

export const checkPlantAccess = (req: AuthRequest, plantId: string): boolean => {
  const user = req.user;
  if (!user) return false;
  
  if (user.role === 'group_admin' || user.permissions.includes('all')) {
    return true;
  }
  
  if (user.role === 'region_admin' && user.region) {
    const { db } = require('../db/memoryStore.js');
    const plant = db.plants.find((p: any) => p.id === plantId);
    return plant && plant.province === user.region;
  }
  
  if ((user.role === 'shift_supervisor' || user.role === 'plant_manager') && user.plantId) {
    return user.plantId === plantId;
  }
  
  if (user.role === 'epb' && user.region) {
    const { db } = require('../db/memoryStore.js');
    const plant = db.plants.find((p: any) => p.id === plantId);
    return plant && plant.province === user.region;
  }
  
  return false;
};

export const filterPlantsByUser = (req: AuthRequest, plants: any[]): any[] => {
  const user = req.user;
  if (!user) return [];
  
  if (user.role === 'group_admin' || user.permissions.includes('all')) {
    return plants;
  }
  
  if (user.role === 'region_admin' && user.region) {
    return plants.filter(p => p.province === user.region);
  }
  
  if ((user.role === 'shift_supervisor' || user.role === 'plant_manager') && user.plantId) {
    return plants.filter(p => p.id === user.plantId);
  }
  
  if (user.role === 'epb' && user.region) {
    return plants.filter(p => p.province === user.region);
  }
  
  return [];
};
