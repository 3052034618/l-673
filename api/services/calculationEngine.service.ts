import type { RealtimeData, AggregatedData } from '../../shared/types.js';

const EMISSION_STANDARDS = {
  so2: 100,
  nox: 300,
  particulate: 20
};

export const calculatePowerPerTon = (totalPower: number, totalGarbage: number): number => {
  if (totalGarbage === 0) return 0;
  return Number((totalPower / totalGarbage).toFixed(2));
};

export const calculateComplianceRate = (data: RealtimeData[]): number => {
  if (data.length === 0) return 100;
  
  const compliantCount = data.filter(d => 
    d.so2 <= EMISSION_STANDARDS.so2 &&
    d.nox <= EMISSION_STANDARDS.nox &&
    d.particulate <= EMISSION_STANDARDS.particulate
  ).length;
  
  return Number(((compliantCount / data.length) * 100).toFixed(2));
};

export const calculateAvailabilityRate = (unitStatuses: { status: string; duration: number }[]): number => {
  if (unitStatuses.length === 0) return 100;
  
  const totalDuration = unitStatuses.reduce((sum, s) => sum + s.duration, 0);
  const runningDuration = unitStatuses
    .filter(s => s.status === 'running')
    .reduce((sum, s) => sum + s.duration, 0);
  
  return totalDuration > 0 ? Number(((runningDuration / totalDuration) * 100).toFixed(2)) : 100;
};

export const calculateIgnitionLossRate = (): number => {
  return Number((2 + Math.random() * 3).toFixed(2));
};

export const checkEmissionAlert = (data: RealtimeData[]): boolean => {
  if (data.length < 2) return false;
  
  const recentData = data.slice(-2);
  return recentData.every(d => 
    d.so2 > EMISSION_STANDARDS.so2 ||
    d.nox > EMISSION_STANDARDS.nox ||
    d.particulate > EMISSION_STANDARDS.particulate
  );
};

export const checkAvailabilityAlert = (rate: number): boolean => {
  return rate < 85;
};

export const checkTemperatureAlert = (temp: number): boolean => {
  return temp > 1100 || temp < 750;
};

export const checkPressureAlert = (pressure: number): boolean => {
  return pressure > 5.5 || pressure < 3.0;
};

export const aggregateRealtimeData = (data: RealtimeData[], period: 'hour' | 'day' | 'month'): AggregatedData[] => {
  const grouped = new Map<string, RealtimeData[]>();
  
  data.forEach(d => {
    let key: string;
    const date = new Date(d.timestamp);
    
    switch (period) {
      case 'hour':
        key = `${date.toISOString().split('T')[0]}-${date.getHours()}`;
        break;
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(d);
  });
  
  const result: AggregatedData[] = [];
  
  grouped.forEach((groupData, key) => {
    const plantId = groupData[0].plantId;
    const totalGarbage = groupData.reduce((sum, d) => sum + d.garbageInput, 0);
    const totalPower = groupData.reduce((sum, d) => sum + d.powerGeneration, 0);
    
    result.push({
      id: `agg-${key}-${plantId}`,
      plantId,
      date: key,
      period,
      totalGarbage: Number(totalGarbage.toFixed(2)),
      totalPower: Number(totalPower.toFixed(2)),
      powerPerTon: calculatePowerPerTon(totalPower, totalGarbage),
      complianceRate: calculateComplianceRate(groupData),
      availabilityRate: calculateAvailabilityRate(
        groupData.map(d => ({ status: 'running', duration: 5 }))
      ),
      ignitionLossRate: calculateIgnitionLossRate()
    });
  });
  
  return result.sort((a, b) => a.date.localeCompare(b.date));
};

export const forecastGap = (
  dailySupply: number[],
  dailyCapacity: number,
  days: number
): { date: string; supply: number; capacity: number; gap: number; recommendations: string[] }[] => {
  const results = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    const supply = dailySupply[i % dailySupply.length] * (0.9 + Math.random() * 0.2);
    const capacity = dailyCapacity * (0.95 + Math.random() * 0.1);
    const gap = supply - capacity;
    
    const recommendations: string[] = [];
    
    if (gap > dailyCapacity * 0.1) {
      recommendations.push('建议启动备用炉提升处理能力');
      recommendations.push('考虑协调周边工厂协同处置');
    } else if (gap > 0) {
      recommendations.push('建议优化排班，延长运行时间');
    } else if (gap < -dailyCapacity * 0.2) {
      recommendations.push('处理能力过剩，可考虑接收周边垃圾');
    }
    
    results.push({
      date: date.toISOString().split('T')[0],
      supply: Number(supply.toFixed(2)),
      capacity: Number(capacity.toFixed(2)),
      gap: Number(gap.toFixed(2)),
      recommendations
    });
  }
  
  return results;
};

export const generateOptimizationSuggestions = (
  plantData: {
    powerPerTon: number;
    complianceRate: number;
    availabilityRate: number;
    failureRate: number;
  },
  ranking: number,
  totalPlants: number
): string[] => {
  const suggestions: string[] = [];
  const percentile = (ranking / totalPlants) * 100;
  
  if (plantData.powerPerTon < 450) {
    suggestions.push('吨垃圾发电量偏低，建议优化燃烧控制参数，调整一二次风配比');
  }
  
  if (plantData.complianceRate < 95) {
    suggestions.push('排放达标率有待提升，建议检查烟气处理系统运行状态，定期更换活性炭');
  }
  
  if (plantData.availabilityRate < 90) {
    suggestions.push('设备可用率偏低，建议优化检修计划，增加预防性维护频次');
  }
  
  if (plantData.failureRate > 2) {
    suggestions.push('设备故障率偏高，建议开展全面设备检查，重点关注关键部件磨损情况');
  }
  
  if (percentile > 50) {
    suggestions.push('综合排名处于中下游，建议组织对标学习，借鉴先进工厂运营经验');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('各项指标表现优秀，继续保持良好运营水平');
    suggestions.push('可考虑开展技术创新，进一步提升发电效率');
  }
  
  return suggestions;
};
