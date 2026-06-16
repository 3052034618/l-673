import { db } from '../db/memoryStore.js';
import { forecastGap } from './calculationEngine.service.js';
import * as XLSX from 'xlsx';
import type { ForecastResult, Plant } from '../../shared/types.js';

export interface SupplyPlanEntry {
  region: string;
  date: string;
  amount: number;
  source: string;
}

export const parseSupplyPlanExcel = (fileBuffer: Buffer): SupplyPlanEntry[] => {
  const workbook = XLSX.read(fileBuffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
  
  const entries: SupplyPlanEntry[] = [];
  
  jsonData.forEach((row, index) => {
    if (index === 0 && typeof row[Object.keys(row)[0]] === 'string') {
      return;
    }
    
    const region = row['区域'] || row['region'] || row['省份'] || '';
    const date = row['日期'] || row['date'] || '';
    const amount = Number(row['垃圾量(吨)'] || row['amount'] || row['quantity'] || 0);
    const source = row['来源'] || row['source'] || '未知';
    
    if (region && date && amount > 0) {
      entries.push({
        region: String(region),
        date: String(date),
        amount,
        source: String(source)
      });
    }
  });
  
  return entries;
};

export const getGapForecast = (
  plantId: string,
  days: number = 30,
  supplyPlan?: SupplyPlanEntry[]
): { forecast: ForecastResult[]; summary: any } => {
  const plant = db.plants.find(p => p.id === plantId);
  if (!plant) {
    throw new Error('工厂不存在');
  }
  
  const dailyCapacity = plant.capacity;
  
  let dailySupply: number[] = [];
  
  if (supplyPlan && supplyPlan.length > 0) {
    const plantRegion = plant.province;
    const regionSupply = supplyPlan.filter(s => s.region === plantRegion || s.region.includes(plant.city));
    
    if (regionSupply.length > 0) {
      const dateMap = new Map<string, number>();
      regionSupply.forEach(s => {
        const current = dateMap.get(s.date) || 0;
        dateMap.set(s.date, current + s.amount);
      });
      
      const sortedDates = Array.from(dateMap.keys()).sort();
      dailySupply = sortedDates.map(d => dateMap.get(d) || 0);
    }
  }
  
  if (dailySupply.length === 0) {
    const historicalData = db.aggregatedData
      .filter(d => d.plantId === plantId && d.period === 'day')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);
    
    if (historicalData.length > 0) {
      const avgDailyGarbage = historicalData.reduce((sum, d) => sum + d.totalGarbage, 0) / historicalData.length;
      for (let i = 0; i < days; i++) {
        const variation = 0.9 + Math.random() * 0.2;
        dailySupply.push(avgDailyGarbage * variation);
      }
    } else {
      for (let i = 0; i < days; i++) {
        dailySupply.push(dailyCapacity * (0.85 + Math.random() * 0.2));
      }
    }
  }
  
  const forecast = forecastGap(dailySupply, dailyCapacity, days);
  
  let totalSupply = 0;
  let totalCapacity = 0;
  let totalGap = 0;
  let maxGap = 0;
  let gapDays = 0;
  
  forecast.forEach(f => {
    totalSupply += f.supply;
    totalCapacity += f.capacity;
    totalGap += f.gap;
    if (f.gap > 0) {
      gapDays++;
      maxGap = Math.max(maxGap, f.gap);
    }
  });
  
  const recommendations: string[] = [];
  
  if (gapDays > days * 0.5) {
    recommendations.push('未来30天存在持续处理缺口，建议立即启动备用炉');
    recommendations.push('协调周边工厂协同处置，预计需外调约' + Math.ceil(totalGap) + '吨');
  } else if (gapDays > 0) {
    recommendations.push('存在阶段性处理缺口，建议优化排班延长运行时间');
    recommendations.push('最大单日缺口' + Math.ceil(maxGap) + '吨，需提前规划调运方案');
  }
  
  if (totalGap < -dailyCapacity * days * 0.1) {
    recommendations.push('处理能力充裕，可考虑接收周边区域垃圾');
  }
  
  recommendations.push('建议建立垃圾量周度预测机制，提前预警供需失衡');
  
  return {
    forecast,
    summary: {
      totalSupply: Number(totalSupply.toFixed(2)),
      totalCapacity: Number(totalCapacity.toFixed(2)),
      totalGap: Number(totalGap.toFixed(2)),
      maxGap: Number(maxGap.toFixed(2)),
      gapDays,
      averageDailySupply: Number((totalSupply / days).toFixed(2)),
      averageDailyCapacity: Number((totalCapacity / days).toFixed(2)),
      recommendations
    }
  };
};

export const getOptimalTransportPlan = (
  plantId: string,
  gapForecast: ForecastResult[]
): {
  sourcePlants: Plant[];
  transportRoutes: {
    from: string;
    to: string;
    amount: number;
    estimatedCost: number;
    priority: number;
  }[];
} => {
  const targetPlant = db.plants.find(p => p.id === plantId);
  if (!targetPlant) {
    throw new Error('工厂不存在');
  }
  
  const gapDays = gapForecast.filter(f => f.gap > 0);
  const totalGap = gapDays.reduce((sum, f) => sum + f.gap, 0);
  
  if (totalGap <= 0) {
    return { sourcePlants: [], transportRoutes: [] };
  }
  
  const availablePlants = db.plants.filter(p => {
    if (p.id === plantId || p.province !== targetPlant.province) return false;
    
    const recentData = db.aggregatedData
      .filter(d => d.plantId === p.id && d.period === 'day')
      .slice(-7);
    
    if (recentData.length === 0) return false;
    
    const avgUsage = recentData.reduce((sum, d) => sum + d.totalGarbage, 0) / recentData.length;
    const spareCapacity = p.capacity - avgUsage;
    
    return spareCapacity > p.capacity * 0.1;
  });
  
  const transportRoutes = availablePlants.slice(0, 3).map((p, index) => {
    const spareCapacity = p.capacity * 0.15;
    const amount = Math.min(spareCapacity, totalGap * (0.5 - index * 0.15));
    
    return {
      from: p.name,
      to: targetPlant.name,
      amount: Number(amount.toFixed(2)),
      estimatedCost: Number((amount * 50).toFixed(2)),
      priority: index + 1
    };
  }).filter(r => r.amount > 0);
  
  return {
    sourcePlants: availablePlants.slice(0, 3),
    transportRoutes
  };
};

export const getStandbyBoilerRecommendation = (
  plantId: string,
  gapForecast: ForecastResult[]
): {
  shouldStart: boolean;
  recommendedStartDate?: string;
  estimatedDuration: number;
  expectedAdditionalCapacity: number;
  costBenefitAnalysis: string;
} => {
  const plant = db.plants.find(p => p.id === plantId);
  if (!plant) {
    throw new Error('工厂不存在');
  }
  
  const gapDays = gapForecast.filter(f => f.gap > plant.capacity * 0.1);
  const consecutiveGaps = findConsecutiveDays(gapForecast);
  
  const shouldStart = consecutiveGaps.maxConsecutive >= 3 || gapDays.length >= 7;
  
  let recommendedStartDate: string | undefined;
  if (shouldStart && gapForecast.length > 0) {
    const firstGap = gapForecast.findIndex(f => f.gap > 0);
    if (firstGap >= 0) {
      const startDate = new Date(gapForecast[firstGap].date);
      startDate.setDate(startDate.getDate() - 1);
      recommendedStartDate = startDate.toISOString().split('T')[0];
    }
  }
  
  const standbyUnit = plant.units.find(u => u.status === 'standby');
  const additionalCapacity = standbyUnit?.capacity || plant.capacity * 0.4;
  
  return {
    shouldStart,
    recommendedStartDate,
    estimatedDuration: Math.max(consecutiveGaps.maxConsecutive, gapDays.length),
    expectedAdditionalCapacity: Number(additionalCapacity.toFixed(2)),
    costBenefitAnalysis: shouldStart 
      ? `启动备用炉预计可增加日处理能力${additionalCapacity.toFixed(0)}吨，预计可减少${gapDays.length}天的处理缺口，经济性可行`
      : '当前缺口较小且不连续，启动备用炉经济性不足，建议通过优化排班解决'
  };
};

const findConsecutiveDays = (forecast: ForecastResult[]): { maxConsecutive: number; startIndex: number } => {
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  let startIndex = -1;
  let currentStart = -1;
  
  forecast.forEach((f, index) => {
    if (f.gap > 0) {
      if (currentConsecutive === 0) {
        currentStart = index;
      }
      currentConsecutive++;
      if (currentConsecutive > maxConsecutive) {
        maxConsecutive = currentConsecutive;
        startIndex = currentStart;
      }
    } else {
      currentConsecutive = 0;
    }
  });
  
  return { maxConsecutive, startIndex };
};
