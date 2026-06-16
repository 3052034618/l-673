import { db, generateId } from '../db/memoryStore.js';
import { generateOptimizationSuggestions } from './calculationEngine.service.js';
import type { WeeklyReport, Plant, AggregatedData } from '../../shared/types.js';

export const getWeeklyReports = (
  plantId?: string,
  page: number = 1,
  pageSize: number = 10
): { reports: WeeklyReport[]; total: number; page: number; pageSize: number } => {
  let reports = [...db.weeklyReports];
  
  if (plantId) {
    reports = reports.filter(r => r.plantId === plantId);
  }
  
  reports.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  
  const total = reports.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedReports = reports.slice(startIndex, startIndex + pageSize);
  
  return {
    reports: paginatedReports,
    total,
    page,
    pageSize
  };
};

export const getWeeklyReportById = (id: string): WeeklyReport | undefined => {
  return db.weeklyReports.find(r => r.id === id);
};

export const generateWeeklyReport = (
  plantId?: string,
  region?: string,
  weekStart?: string
): WeeklyReport => {
  const now = new Date();
  let startOfWeek = weekStart ? new Date(weekStart) : new Date(now);
  
  const dayOfWeek = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  startOfWeek = new Date(startOfWeek.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  let targetPlants: Plant[] = [];
  
  if (plantId) {
    const plant = db.plants.find(p => p.id === plantId);
    if (plant) {
      targetPlants = [plant];
    }
  } else if (region) {
    targetPlants = db.plants.filter(p => p.province === region);
  } else {
    targetPlants = db.plants;
  }
  
  if (targetPlants.length === 0) {
    throw new Error('未找到对应的工厂数据');
  }
  
  const weekStartStr = startOfWeek.toISOString().split('T')[0];
  const weekEndStr = endOfWeek.toISOString().split('T')[0];
  
  const existingReport = db.weeklyReports.find(r => 
    (r.plantId === plantId || r.region === region) &&
    r.weekStart === weekStartStr
  );
  
  if (existingReport) {
    return existingReport;
  }
  
  let totalPower = 0;
  let totalCompliance = 0;
  let totalAvailability = 0;
  let totalFailureRate = 0;
  let dataPoints = 0;
  
  const plantMetrics: { plantId: string; plantName: string; powerPerTon: number; complianceRate: number; availabilityRate: number; failureRate: number }[] = [];
  
  targetPlants.forEach(plant => {
    const plantData = db.aggregatedData.filter(d => 
      d.plantId === plant.id &&
      d.period === 'day' &&
      d.date >= weekStartStr &&
      d.date <= weekEndStr
    );
    
    if (plantData.length > 0) {
      const plantPower = plantData.reduce((sum, d) => sum + d.totalPower, 0);
      const plantCompliance = plantData.reduce((sum, d) => sum + d.complianceRate, 0) / plantData.length;
      const plantAvailability = plantData.reduce((sum, d) => sum + d.availabilityRate, 0) / plantData.length;
      const plantGarbage = plantData.reduce((sum, d) => sum + d.totalGarbage, 0);
      const powerPerTon = plantGarbage > 0 ? plantPower / plantGarbage : 0;
      const failureRate = plantAvailability < 95 ? (100 - plantAvailability) / 2 : 1;
      
      totalPower += plantPower;
      totalCompliance += plantCompliance;
      totalAvailability += plantAvailability;
      totalFailureRate += failureRate;
      dataPoints++;
      
      plantMetrics.push({
        plantId: plant.id,
        plantName: plant.name,
        powerPerTon,
        complianceRate: plantCompliance,
        availabilityRate: plantAvailability,
        failureRate
      });
    }
  });
  
  const avgCompliance = dataPoints > 0 ? totalCompliance / dataPoints : 100;
  const avgAvailability = dataPoints > 0 ? totalAvailability / dataPoints : 100;
  const avgFailureRate = dataPoints > 0 ? totalFailureRate / dataPoints : 0;
  
  const lastWeekStart = new Date(startOfWeek);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(endOfWeek);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
  
  const lastYearStart = new Date(startOfWeek);
  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
  
  const lastWeekPower = calculatePeriodPower(targetPlants, lastWeekStart, lastWeekEnd);
  const lastYearPower = calculatePeriodPower(targetPlants, lastYearStart, new Date(lastYearStart.getTime() + 7 * 24 * 60 * 60 * 1000));
  
  const powerMoM = lastWeekPower > 0 ? ((totalPower - lastWeekPower) / lastWeekPower) * 100 : 0;
  const powerYoY = lastYearPower > 0 ? ((totalPower - lastYearPower) / lastYearPower) * 100 : 0;
  
  const ranking = plantMetrics
    .map(m => ({
      plantId: m.plantId,
      plantName: m.plantName,
      value: Number(m.powerPerTon.toFixed(2))
    }))
    .sort((a, b) => b.value - a.value);
  
  const avgMetrics = {
    powerPerTon: ranking.length > 0 ? ranking.reduce((s, r) => s + r.value, 0) / ranking.length : 0,
    complianceRate: avgCompliance,
    availabilityRate: avgAvailability,
    failureRate: avgFailureRate
  };
  
  const medianRank = Math.ceil(ranking.length / 2);
  const optimizationSuggestions = generateOptimizationSuggestions(
    avgMetrics,
    medianRank,
    ranking.length || 1
  );
  
  const report: WeeklyReport = {
    id: generateId(),
    plantId,
    region,
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    totalPower: Number(totalPower.toFixed(2)),
    powerYoY: Number(powerYoY.toFixed(2)),
    powerMoM: Number(powerMoM.toFixed(2)),
    complianceRate: Number(avgCompliance.toFixed(2)),
    failureRate: Number(avgFailureRate.toFixed(2)),
    powerPerTonRanking: ranking,
    optimizationSuggestions,
    createdAt: new Date().toISOString()
  };
  
  db.weeklyReports.push(report);
  
  return report;
};

const calculatePeriodPower = (plants: Plant[], start: Date, end: Date): number => {
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  
  let totalPower = 0;
  
  plants.forEach(plant => {
    const data = db.aggregatedData.filter(d => 
      d.plantId === plant.id &&
      d.period === 'day' &&
      d.date >= startStr &&
      d.date <= endStr
    );
    
    totalPower += data.reduce((sum, d) => sum + d.totalPower, 0);
  });
  
  return totalPower;
};

export const getReportStatistics = (plantId?: string) => {
  const reports = plantId 
    ? db.weeklyReports.filter(r => r.plantId === plantId)
    : db.weeklyReports.filter(r => !r.plantId && !r.region);
  
  if (reports.length === 0) {
    return {
      totalReports: 0,
      avgPower: 0,
      avgCompliance: 0,
      trend: 'stable'
    };
  }
  
  const sortedReports = reports.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const avgPower = reports.reduce((sum, r) => sum + r.totalPower, 0) / reports.length;
  const avgCompliance = reports.reduce((sum, r) => sum + r.complianceRate, 0) / reports.length;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (sortedReports.length >= 2) {
    const recent = sortedReports.slice(-3);
    const earlier = sortedReports.slice(-6, -3);
    
    if (earlier.length > 0) {
      const recentAvg = recent.reduce((s, r) => s + r.totalPower, 0) / recent.length;
      const earlierAvg = earlier.reduce((s, r) => s + r.totalPower, 0) / earlier.length;
      
      if (recentAvg > earlierAvg * 1.02) trend = 'up';
      else if (recentAvg < earlierAvg * 0.98) trend = 'down';
    }
  }
  
  return {
    totalReports: reports.length,
    avgPower: Number(avgPower.toFixed(2)),
    avgCompliance: Number(avgCompliance.toFixed(2)),
    trend
  };
};

export const deleteReport = (id: string): void => {
  const index = db.weeklyReports.findIndex(r => r.id === id);
  if (index === -1) {
    throw new Error('报告不存在');
  }
  
  db.weeklyReports.splice(index, 1);
};
