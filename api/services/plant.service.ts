import { db, generateId } from '../db/memoryStore.js';
import type { Plant, Unit, ProvinceStats, PlantRankingItem } from '../../shared/types.js';

export const getAllPlants = (): Plant[] => {
  return db.plants;
};

export const getPlantById = (id: string): Plant | undefined => {
  return db.plants.find(p => p.id === id);
};

export const getPlantsByProvince = (province: string): Plant[] => {
  return db.plants.filter(p => p.province === province);
};

export const createPlant = (plantData: Omit<Plant, 'id' | 'createdAt'>): Plant => {
  const newPlant: Plant = {
    ...plantData,
    id: generateId(),
    createdAt: new Date().toISOString()
  };
  
  db.plants.push(newPlant);
  return newPlant;
};

export const updatePlant = (id: string, plantData: Partial<Plant>): Plant => {
  const index = db.plants.findIndex(p => p.id === id);
  if (index === -1) {
    throw new Error('工厂不存在');
  }
  
  db.plants[index] = { ...db.plants[index], ...plantData };
  return db.plants[index];
};

export const deletePlant = (id: string): void => {
  const index = db.plants.findIndex(p => p.id === id);
  if (index === -1) {
    throw new Error('工厂不存在');
  }
  
  db.plants.splice(index, 1);
  db.units = db.units.filter(u => u.plantId !== id);
  db.realtimeData = db.realtimeData.filter(d => d.plantId !== id);
  db.aggregatedData = db.aggregatedData.filter(d => d.plantId !== id);
};

export const getProvinceStats = (): ProvinceStats[] => {
  const provinceMap = new Map<string, ProvinceStats>();
  
  db.plants.forEach(plant => {
    const existing = provinceMap.get(plant.province) || {
      province: plant.province,
      totalGarbage: 0,
      totalPower: 0,
      plantCount: 0,
      complianceRate: 0
    };
    
    const plantAggData = db.aggregatedData
      .filter(d => d.plantId === plant.id && d.period === 'day')
      .slice(-7);
    
    const totalGarbage = plantAggData.reduce((sum, d) => sum + d.totalGarbage, 0);
    const totalPower = plantAggData.reduce((sum, d) => sum + d.totalPower, 0);
    const avgCompliance = plantAggData.length > 0
      ? plantAggData.reduce((sum, d) => sum + d.complianceRate, 0) / plantAggData.length
      : 100;
    
    provinceMap.set(plant.province, {
      province: plant.province,
      totalGarbage: existing.totalGarbage + totalGarbage,
      totalPower: existing.totalPower + totalPower,
      plantCount: existing.plantCount + 1,
      complianceRate: (existing.complianceRate * existing.plantCount + avgCompliance) / (existing.plantCount + 1)
    });
  });
  
  return Array.from(provinceMap.values());
};

export const getPlantRanking = (metric: 'powerPerTon' | 'complianceRate' | 'availabilityRate'): PlantRankingItem[] => {
  const rankings = db.plants.map(plant => {
    const recentData = db.aggregatedData
      .filter(d => d.plantId === plant.id && d.period === 'day')
      .slice(-7);
    
    let value = 0;
    if (recentData.length > 0) {
      value = recentData.reduce((sum, d) => sum + d[metric], 0) / recentData.length;
    }
    
    return {
      plantId: plant.id,
      plantName: plant.name,
      province: plant.province,
      region: plant.region,
      value: Number(value.toFixed(2)),
      rank: 0
    };
  });
  
  rankings.sort((a, b) => b.value - a.value);
  rankings.forEach((item, index) => {
    item.rank = index + 1;
  });
  
  return rankings;
};

export const addUnit = (plantId: string, unitData: Omit<Unit, 'id' | 'plantId' | 'createdAt'>): Unit => {
  const plant = db.plants.find(p => p.id === plantId);
  if (!plant) {
    throw new Error('工厂不存在');
  }
  
  const newUnit: Unit = {
    ...unitData,
    id: generateId(),
    plantId,
    createdAt: new Date().toISOString()
  };
  
  db.units.push(newUnit);
  
  plant.units.push(newUnit);
  plant.capacity += newUnit.capacity;
  
  return newUnit;
};

export const updateUnit = (unitId: string, unitData: Partial<Unit>): Unit => {
  const index = db.units.findIndex(u => u.id === unitId);
  if (index === -1) {
    throw new Error('机组不存在');
  }
  
  const oldCapacity = db.units[index].capacity;
  db.units[index] = { ...db.units[index], ...unitData };
  
  if (unitData.capacity) {
    const plant = db.plants.find(p => p.id === db.units[index].plantId);
    if (plant) {
      plant.capacity = plant.capacity - oldCapacity + unitData.capacity;
    }
  }
  
  return db.units[index];
};
