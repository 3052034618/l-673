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

const safeNumber = (value: number, fallback: number = 0): number => {
  if (isNaN(value) || !isFinite(value) || value === null || value === undefined) {
    return fallback;
  }
  return Number(value.toFixed(2));
};

const findConsecutiveDays = (forecast: ForecastResult[]): { maxConsecutive: number; startIndex: number } => {
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  let startIndex = -1;
  let currentStart = -1;
  
  const validForecast = Array.isArray(forecast) ? forecast : [];
  
  validForecast.forEach((f, index) => {
    const gap = safeNumber(f?.gap, 0);
    if (gap > 0) {
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
  
  return { maxConsecutive, startIndex: Math.max(0, startIndex) };
};

export const parseSupplyPlanExcel = async (
  fileBuffer: Buffer,
  plantId: string
): Promise<{ regions: SupplyPlanEntry[]; summary: any }> => {
  const workbook = XLSX.read(fileBuffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
  
  const entries: SupplyPlanEntry[] = [];
  const regionMap = new Map<string, number>();
  
  jsonData.forEach((row, index) => {
    if (index === 0 && typeof row[Object.keys(row)[0]] === 'string') {
      const header = String(row[Object.keys(row)[0]]);
      if (header.includes('区域') || header.includes('region') || header.includes('日期')) {
        return;
      }
    }
    
    const region = String(row['区域'] || row['region'] || row['省份'] || row['province'] || '未知区域');
    const date = String(row['日期'] || row['date'] || '');
    const amount = safeNumber(Number(row['垃圾量(吨)'] || row['amount'] || row['quantity'] || row['垃圾量'] || 0));
    const source = String(row['来源'] || row['source'] || '本地');
    
    if (region && amount > 0) {
      entries.push({ region, date, amount, source });
      regionMap.set(region, (regionMap.get(region) || 0) + amount);
    }
  });
  
  const plant = db.plants.find(p => p.id === plantId);
  if (plant && entries.length > 0) {
    const existingForecast = db.forecastHistory || [];
    existingForecast.push({
      id: Date.now().toString(),
      plantId,
      uploadDate: new Date().toISOString(),
      data: entries
    });
    db.forecastHistory = existingForecast;
  }
  
  const regions = Array.from(regionMap.entries()).map(([region, amount]) => ({
    region,
    date: '',
    amount: safeNumber(amount),
    source: '汇总'
  }));
  
  return {
    regions: entries,
    summary: {
      totalRegions: regionMap.size,
      totalAmount: safeNumber(Array.from(regionMap.values()).reduce((a, b) => a + b, 0)),
      regions: regions.map(r => ({ region: r.region, amount: r.amount }))
    }
  };
};

export const getGapForecast = (
  plantId: string,
  days: number = 30,
  region?: string
): { forecast: ForecastResult[]; summary: any } => {
  const plant = db.plants.find(p => p.id === plantId);
  if (!plant) {
    throw new Error('工厂不存在');
  }
  
  const dailyCapacity = safeNumber(plant.capacity, 1000);
  const startDate = new Date();
  
  const historicalData = db.aggregatedData
    .filter(d => d.plantId === plantId && d.period === 'day')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
  
  let avgDailyGarbage = dailyCapacity * 0.95;
  if (historicalData.length > 0) {
    const validData = historicalData.filter(d => d.totalGarbage > 0);
    if (validData.length > 0) {
      avgDailyGarbage = validData.reduce((sum, d) => sum + safeNumber(d.totalGarbage), 0) / validData.length;
    }
  }
  avgDailyGarbage = safeNumber(avgDailyGarbage, dailyCapacity * 0.95);
  
  let dailySupply: number[] = [];
  
  const forecastHistory = db.forecastHistory || [];
  const plantForecast = forecastHistory
    .filter(f => f.plantId === plantId)
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())[0];
  
  if (plantForecast && plantForecast.data && plantForecast.data.length > 0) {
    let supplyData = plantForecast.data;
    if (region && region.trim() !== '' && region !== 'all') {
      supplyData = supplyData.filter(s => {
        const sRegion = String(s.region || '');
        return sRegion === region || 
               sRegion.includes(region) ||
               region.includes(sRegion);
      });
    }
    
    if (supplyData.length > 0) {
      const dateMap = new Map<string, number>();
      supplyData.forEach(s => {
        const dateStr = s.date || '';
        if (dateStr) {
          const current = dateMap.get(dateStr) || 0;
          dateMap.set(dateStr, current + safeNumber(s.amount));
        }
      });
      
      const sortedDates = Array.from(dateMap.keys()).sort();
      if (sortedDates.length > 0) {
        const avgFromPlan = Array.from(dateMap.values()).reduce((a, b) => a + b, 0) / sortedDates.length;
        for (let i = 0; i < days; i++) {
          const dateKey = sortedDates[i % sortedDates.length];
          const baseValue = dateMap.get(dateKey) || avgFromPlan;
          const variation = 0.95 + (Math.random() * 0.1);
          dailySupply.push(safeNumber(baseValue * variation, avgDailyGarbage));
        }
      }
    }
  }
  
  while (dailySupply.length < days) {
    const variation = 0.9 + (Math.random() * 0.2);
    let baseSupply = avgDailyGarbage;
    
    if (region && region.trim() !== '' && region !== 'all') {
      const regionPlants = db.plants.filter(p => 
        p.province === region || 
        p.province.includes(region) ||
        region.includes(p.province) ||
        p.region === region ||
        p.region.includes(region) ||
        region.includes(p.region)
      );
      if (regionPlants.length > 0) {
        const regionCapacity = regionPlants.reduce((sum, p) => sum + safeNumber(p.capacity), 0);
        const share = safeNumber(plant.capacity / regionCapacity);
        baseSupply = safeNumber(avgDailyGarbage * (1 + share * 0.1));
      }
    }
    
    dailySupply.push(safeNumber(baseSupply * variation, dailyCapacity * 0.9));
  }
  
  dailySupply = dailySupply.slice(0, days).map(s => safeNumber(s, dailyCapacity * 0.9));
  
  const forecast = forecastGap(dailySupply, dailyCapacity, days);
  
  const validForecast = forecast.map((f, index) => {
    const forecastDate = new Date(startDate);
    forecastDate.setDate(forecastDate.getDate() + index);
    
    return {
      date: forecastDate.toISOString().split('T')[0],
      supply: safeNumber(f.supply, dailyCapacity * 0.9),
      capacity: safeNumber(f.capacity, dailyCapacity),
      gap: safeNumber(f.gap, 0),
      recommendations: Array.isArray(f.recommendations) ? f.recommendations.filter(Boolean) : []
    };
  });
  
  let totalSupply = 0;
  let totalCapacity = 0;
  let totalGap = 0;
  let maxGap = 0;
  let gapDays = 0;
  
  validForecast.forEach(f => {
    totalSupply += f.supply;
    totalCapacity += f.capacity;
    totalGap += f.gap;
    if (f.gap > 0) {
      gapDays++;
      maxGap = Math.max(maxGap, f.gap);
    }
  });
  
  totalSupply = safeNumber(totalSupply);
  totalCapacity = safeNumber(totalCapacity);
  totalGap = safeNumber(totalGap);
  maxGap = safeNumber(maxGap);
  
  const recommendations: string[] = [];
  
  if (gapDays > days * 0.5) {
    recommendations.push(`未来${days}天存在持续处理缺口（${gapDays}天），建议立即启动备用炉`);
    recommendations.push(`协调周边工厂协同处置，预计需外调约${Math.ceil(Math.max(0, totalGap))}吨`);
  } else if (gapDays > 0) {
    recommendations.push(`存在阶段性处理缺口（${gapDays}天），建议优化排班延长运行时间`);
    recommendations.push(`最大单日缺口${Math.ceil(maxGap)}吨，需提前规划调运方案`);
  } else {
    recommendations.push('未来30天处理能力充足，供需平衡');
  }
  
  if (totalGap < -dailyCapacity * days * 0.05) {
    recommendations.push(`处理能力充裕，富余${Math.ceil(Math.abs(totalGap))}吨，可考虑接收周边区域垃圾`);
  }
  
  recommendations.push('建议建立垃圾量周度预测机制，提前预警供需失衡');
  
  const averageDailySupply = safeNumber(totalSupply / days);
  const averageDailyCapacity = safeNumber(totalCapacity / days);
  
  return {
    forecast: validForecast,
    summary: {
      totalSupply,
      totalCapacity,
      totalGap,
      maxGap,
      gapDays,
      averageDailySupply,
      averageDailyCapacity,
      region: region || plant.province,
      recommendations
    }
  };
};

export const getOptimalTransportPlan = (
  plantId: string,
  targetDate?: string,
  region?: string
): {
  hasGap: boolean;
  sourcePlants: Plant[];
  transportRoutes: {
    fromPlantId: string;
    fromPlantName: string;
    fromProvince: string;
    toPlantId: string;
    toPlantName: string;
    amount: number;
    estimatedCost: number;
    costPerTon: number;
    priority: number;
    distanceKm: number;
  }[];
  summary: any;
} => {
  const targetPlant = db.plants.find(p => p.id === plantId);
  if (!targetPlant) {
    throw new Error('工厂不存在');
  }
  
  const gapResult = getGapForecast(plantId, 30, region);
  const { forecast, summary } = gapResult;
  
  const gapDays = forecast.filter(f => f.gap > 0);
  const totalGap = safeNumber(gapDays.reduce((sum, f) => sum + f.gap, 0));
  
  if (totalGap <= 0 || gapDays.length === 0) {
    return {
      hasGap: false,
      sourcePlants: [],
      transportRoutes: [],
      summary: {
        totalGap: 0,
        gapDays: 0,
        message: '当前无处理缺口，无需调运',
        maxGap: 0,
        averageDailyGap: 0
      }
    };
  }
  
  const maxGap = safeNumber(Math.max(...gapDays.map(f => f.gap), 0));
  const averageDailyGap = safeNumber(totalGap / gapDays.length);
  
  const sameProvincePlants = db.plants.filter(p => 
    p.id !== plantId && 
    p.province === targetPlant.province &&
    p.status === 'running'
  );
  
  const availablePlants: Plant[] = [];
  const plantSpareCapacity: Map<string, number> = new Map();
  
  sameProvincePlants.forEach(p => {
    const recentData = db.aggregatedData
      .filter(d => d.plantId === p.id && d.period === 'day')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
    
    let avgUsage = safeNumber(p.capacity * 0.85);
    if (recentData.length > 0) {
      const validUsage = recentData
        .map(d => safeNumber(d.totalGarbage))
        .filter(v => v > 0);
      if (validUsage.length > 0) {
        avgUsage = safeNumber(validUsage.reduce((a, b) => a + b, 0) / validUsage.length);
      }
    }
    
    const spareCapacity = safeNumber(safeNumber(p.capacity) - avgUsage);
    
    if (spareCapacity > safeNumber(p.capacity * 0.08)) {
      availablePlants.push(p);
      plantSpareCapacity.set(p.id, spareCapacity);
    }
  });
  
  if (availablePlants.length === 0) {
    return {
      hasGap: true,
      sourcePlants: [],
      transportRoutes: [],
      summary: {
        totalGap,
        gapDays: gapDays.length,
        maxGap,
        averageDailyGap,
        message: '周边暂无可用调运工厂，建议启动备用炉'
      }
    };
  }
  
  availablePlants.sort((a, b) => {
    const spareA = plantSpareCapacity.get(a.id) || 0;
    const spareB = plantSpareCapacity.get(b.id) || 0;
    return spareB - spareA;
  });
  
  const topPlants = availablePlants.slice(0, 3);
  const transportRoutes = topPlants.map((p, index) => {
    const spareCapacity = safeNumber(plantSpareCapacity.get(p.id) || 0);
    const weight = 0.5 - (index * 0.15);
    const amount = safeNumber(Math.min(spareCapacity, Math.max(totalGap * weight, maxGap * 0.3)));
    const distanceKm = safeNumber(50 + (index * 30) + (Math.random() * 20), 50);
    const costPerTon = safeNumber(2 + (distanceKm / 50), 2);
    const estimatedCost = safeNumber(amount * costPerTon);
    
    return {
      fromPlantId: p.id,
      fromPlantName: p.name,
      fromProvince: p.province,
      toPlantId: targetPlant.id,
      toPlantName: targetPlant.name,
      amount,
      estimatedCost,
      costPerTon,
      priority: index + 1,
      distanceKm
    };
  }).filter(r => r.amount > 10);
  
  const totalTransportAmount = safeNumber(transportRoutes.reduce((sum, r) => sum + r.amount, 0));
  const totalTransportCost = safeNumber(transportRoutes.reduce((sum, r) => sum + r.estimatedCost, 0));
  
  return {
    hasGap: true,
    sourcePlants: topPlants,
    transportRoutes,
    summary: {
      totalGap,
      gapDays: gapDays.length,
      maxGap,
      averageDailyGap,
      totalTransportAmount,
      totalTransportCost,
      message: transportRoutes.length > 0 
        ? `已规划${transportRoutes.length}条调运路线，预计可解决${totalTransportAmount.toFixed(0)}吨缺口`
        : '调运量不足，建议结合备用炉方案',
      recommendations: [
        `优先选择${transportRoutes[0]?.fromPlantName || '邻近工厂'}进行调运`,
        '建议与调运工厂签订长期合作协议，稳定调运价格',
        '调运过程中需做好运输路线规划，确保及时送达'
      ]
    }
  };
};

export const getStandbyBoilerRecommendation = (
  plantId: string,
  region?: string
): {
  shouldStart: boolean;
  recommendedStartDate?: string;
  estimatedDuration: number;
  expectedAdditionalCapacity: number;
  expectedDailyProcessing: number;
  totalExpectedIncrement: number;
  costBenefitAnalysis: string;
  noStartReason?: string;
  forecastSummary: any;
  unitRecommendation?: {
    unitId: string;
    unitName: string;
    unitCapacity: number;
  };
} => {
  const plant = db.plants.find(p => p.id === plantId);
  if (!plant) {
    throw new Error('工厂不存在');
  }
  
  const gapResult = getGapForecast(plantId, 30, region);
  const { forecast, summary } = gapResult;
  
  const significantGapThreshold = safeNumber(plant.capacity * 0.1, 100);
  const significantGapDays = forecast.filter(f => f.gap > significantGapThreshold);
  const consecutiveGaps = findConsecutiveDays(forecast);
  
  const standbyUnits = plant.units.filter(u => u.status === 'standby');
  const runningUnits = plant.units.filter(u => u.status === 'running');
  const additionalCapacity = standbyUnits.length > 0 
    ? safeNumber(standbyUnits.reduce((sum, u) => sum + safeNumber(u.capacity), 0))
    : safeNumber(plant.capacity * 0.4);
  
  const maxConsecutive = consecutiveGaps.maxConsecutive;
  const totalSignificantGapDays = significantGapDays.length;
  
  const shouldStart = maxConsecutive >= 3 || totalSignificantGapDays >= 7 || summary.maxGap > plant.capacity * 0.2;
  
  let recommendedStartDate: string | undefined;
  let noStartReason: string | undefined;
  
  if (shouldStart) {
    const firstSignificantGap = forecast.findIndex(f => f.gap > significantGapThreshold);
    if (firstSignificantGap >= 0) {
      const startDate = new Date(forecast[firstSignificantGap].date);
      startDate.setDate(startDate.getDate() - 1);
      recommendedStartDate = startDate.toISOString().split('T')[0];
    }
  } else {
    const reasons: string[] = [];
    
    if (totalSignificantGapDays === 0) {
      reasons.push('未来30天无明显处理缺口');
    } else if (maxConsecutive < 3 && totalSignificantGapDays < 7) {
      reasons.push(`缺口天数较少（${totalSignificantGapDays}天）且不连续（最长${maxConsecutive}天）`);
    }
    
    if (summary.maxGap < significantGapThreshold) {
      reasons.push(`最大单日缺口${summary.maxGap.toFixed(0)}吨，小于产能10%（${significantGapThreshold.toFixed(0)}吨）`);
    }
    
    if (runningUnits.length > 0) {
      const totalRunningCapacity = runningUnits.reduce((sum, u) => sum + safeNumber(u.capacity), 0);
      const avgLoad = totalRunningCapacity > 0 ? summary.averageDailySupply / totalRunningCapacity : 0;
      if (avgLoad < 0.9) {
        reasons.push(`当前机组平均负荷${(avgLoad * 100).toFixed(1)}%，仍有优化空间`);
      }
    }
    
    noStartReason = reasons.join('；') || '当前缺口较小，启动备用炉经济性不足';
  }
  
  const estimatedDuration = shouldStart 
    ? Math.max(maxConsecutive, totalSignificantGapDays, 5)
    : 0;
  
  const expectedDailyProcessing = shouldStart ? additionalCapacity : 0;
  const totalExpectedIncrement = shouldStart 
    ? safeNumber(additionalCapacity * estimatedDuration)
    : 0;
  
  let costBenefitAnalysis: string;
  if (shouldStart) {
    const expectedGapReduction = Math.min(totalExpectedIncrement, Math.max(0, summary.totalGap));
    const gapCoveragePercent = summary.totalGap > 0 
      ? (expectedGapReduction / Math.max(1, summary.totalGap)) * 100 
      : 100;
    
    costBenefitAnalysis = `启动备用炉预计可增加日处理能力${additionalCapacity.toFixed(0)}吨，` +
      `运行${estimatedDuration}天预计可增加处理量${totalExpectedIncrement.toFixed(0)}吨，` +
      `可覆盖约${gapCoveragePercent.toFixed(1)}%的缺口，经济性可行。` +
      `建议${standbyUnits.length > 0 ? `启动${standbyUnits[0].name}` : '启用备用产能'}。`;
  } else {
    costBenefitAnalysis = '当前缺口较小且不连续，启动备用炉经济性不足。' +
      '建议通过优化运行班次、调整燃烧参数、协调临时调运等方式解决。' +
      '持续监控缺口变化，若缺口扩大再考虑启动备用炉。';
  }
  
  let unitRecommendation: any = undefined;
  if (shouldStart && standbyUnits.length > 0) {
    const bestUnit = standbyUnits.reduce((best, u) => 
      safeNumber(u.capacity) > safeNumber(best.capacity) ? u : best
    , standbyUnits[0]);
    
    unitRecommendation = {
      unitId: bestUnit.id,
      unitName: bestUnit.name,
      unitCapacity: safeNumber(bestUnit.capacity)
    };
  }
  
  return {
    shouldStart,
    recommendedStartDate,
    estimatedDuration,
    expectedAdditionalCapacity: additionalCapacity,
    expectedDailyProcessing,
    totalExpectedIncrement,
    costBenefitAnalysis,
    noStartReason,
    forecastSummary: summary,
    unitRecommendation
  };
};

export const getForecastHistory = (): any[] => {
  return db.forecastHistory || [];
};
