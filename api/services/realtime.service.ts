import { db, generateId } from '../db/memoryStore.js';
import { aggregateRealtimeData } from './calculationEngine.service.js';
import type { RealtimeData, AggregatedData, PeriodType } from '../../shared/types.js';

export const getCurrentRealtimeData = (plantId?: string, unitId?: string): RealtimeData[] => {
  let data = [...db.realtimeData];
  
  if (plantId) {
    data = data.filter(d => d.plantId === plantId);
  }
  
  if (unitId) {
    data = data.filter(d => d.unitId === unitId);
  }
  
  const latestData: RealtimeData[] = [];
  const unitMap = new Map<string, RealtimeData>();
  
  data.forEach(d => {
    const key = d.unitId;
    const existing = unitMap.get(key);
    if (!existing || new Date(d.timestamp) > new Date(existing.timestamp)) {
      unitMap.set(key, d);
    }
  });
  
  unitMap.forEach(d => latestData.push(d));
  
  return latestData.sort((a, b) => a.plantId.localeCompare(b.plantId));
};

export const getRealtimeHistory = (
  plantId: string,
  startDate?: string,
  endDate?: string,
  unitId?: string
): RealtimeData[] => {
  let data = db.realtimeData.filter(d => d.plantId === plantId);
  
  if (unitId) {
    data = data.filter(d => d.unitId === unitId);
  }
  
  if (startDate) {
    data = data.filter(d => new Date(d.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    data = data.filter(d => new Date(d.timestamp) <= new Date(endDate));
  }
  
  return data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const getAggregatedData = (
  plantId: string,
  period: PeriodType = 'day',
  startDate?: string,
  endDate?: string
): AggregatedData[] => {
  const plantData = db.realtimeData.filter(d => d.plantId === plantId);
  
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    plantData.filter(d => new Date(d.timestamp) >= start);
  }
  
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    plantData.filter(d => new Date(d.timestamp) <= end);
  }
  
  const storedAggregated = db.aggregatedData.filter(d => 
    d.plantId === plantId && d.period === period
  );
  
  if (storedAggregated.length > 0) {
    return storedAggregated.sort((a, b) => a.date.localeCompare(b.date));
  }
  
  return aggregateRealtimeData(plantData, period);
};

export const addRealtimeData = (data: Omit<RealtimeData, 'id'>): RealtimeData => {
  const newData: RealtimeData = {
    ...data,
    id: generateId()
  };
  
  db.realtimeData.push(newData);
  
  if (db.realtimeData.length > 100000) {
    db.realtimeData = db.realtimeData.slice(-50000);
  }
  
  return newData;
};

export const simulateRealtimeData = (): RealtimeData[] => {
  const newData: RealtimeData[] = [];
  const now = new Date();
  
  db.units.forEach(unit => {
    if (unit.status !== 'running') return;
    
    const isEmissionAlert = Math.random() < 0.01;
    const isTempAlert = Math.random() < 0.005;
    
    const data: RealtimeData = {
      id: generateId(),
      plantId: unit.plantId,
      unitId: unit.id,
      timestamp: now.toISOString(),
      furnaceTemp: isTempAlert ? 1200 + Math.random() * 150 : 850 + Math.random() * 200,
      steamPressure: 3.5 + Math.random() * 2,
      powerGeneration: unit.capacity * (0.6 + Math.random() * 0.35),
      so2: isEmissionAlert ? 100 + Math.random() * 100 : 20 + Math.random() * 60,
      nox: isEmissionAlert ? 300 + Math.random() * 200 : 80 + Math.random() * 170,
      particulate: isEmissionAlert ? 20 + Math.random() * 30 : 3 + Math.random() * 12,
      garbageInput: unit.capacity * (0.25 + Math.random() * 0.1)
    };
    
    db.realtimeData.push(data);
    newData.push(data);
  });
  
  return newData;
};

export const getPlantSummary = (plantId: string) => {
  const plant = db.plants.find(p => p.id === plantId);
  if (!plant) {
    throw new Error('工厂不存在');
  }
  
  const realtimeData = getCurrentRealtimeData(plantId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayData = db.realtimeData.filter(d => 
    d.plantId === plantId && new Date(d.timestamp) >= today
  );
  
  const totalGarbageToday = todayData.reduce((sum, d) => sum + d.garbageInput, 0);
  const totalPowerToday = todayData.reduce((sum, d) => sum + d.powerGeneration, 0);
  
  const recent7Days = [...db.aggregatedData]
    .filter(d => d.plantId === plantId && d.period === 'day')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);
  
  const avgCompliance = recent7Days.length > 0
    ? recent7Days.reduce((sum, d) => sum + d.complianceRate, 0) / recent7Days.length
    : 100;
  
  const avgAvailability = recent7Days.length > 0
    ? recent7Days.reduce((sum, d) => sum + d.availabilityRate, 0) / recent7Days.length
    : 100;
  
  const runningUnits = plant.units.filter(u => u.status === 'running').length;
  
  return {
    plant,
    realtimeData,
    totalGarbageToday: Number(totalGarbageToday.toFixed(2)),
    totalPowerToday: Number(totalPowerToday.toFixed(2)),
    powerPerTonToday: totalGarbageToday > 0 ? Number((totalPowerToday / totalGarbageToday).toFixed(2)) : 0,
    avgCompliance: Number(avgCompliance.toFixed(2)),
    avgAvailability: Number(avgAvailability.toFixed(2)),
    runningUnits,
    totalUnits: plant.units.length
  };
};
