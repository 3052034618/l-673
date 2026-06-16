import request from './request';

export const getGapForecast = (
  paramsOrPlantId?: string | {
    plantId?: string;
    days?: number;
    region?: string;
  },
  days?: number,
  region?: string
): Promise<{
  forecast: Array<{
    date: string;
    supply: number;
    capacity: number;
    gap: number;
    recommendations: string[];
  }>;
  summary: {
    totalSupply: number;
    totalCapacity: number;
    totalGap: number;
    maxGap: number;
    gapDays: number;
    averageDailySupply: number;
    averageDailyCapacity: number;
    region: string;
    recommendations: string[];
  };
}> => {
  let params: any = {};
  if (typeof paramsOrPlantId === 'object' && paramsOrPlantId !== null) {
    params = paramsOrPlantId;
  } else {
    if (paramsOrPlantId) params.plantId = paramsOrPlantId;
    if (days !== undefined) params.days = days;
    if (region) params.region = region;
  }
  return request.get('/forecast/gap', { params });
};

export const getOptimalTransportPlan = (
  paramsOrPlantId?: string | {
    plantId?: string;
    targetDate?: string;
    region?: string;
  },
  targetDate?: string,
  region?: string
): Promise<{
  hasGap: boolean;
  sourcePlants: any[];
  transportRoutes: Array<{
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
  }>;
  summary: any;
}> => {
  let params: any = {};
  if (typeof paramsOrPlantId === 'object' && paramsOrPlantId !== null) {
    params = paramsOrPlantId;
  } else {
    if (paramsOrPlantId) params.plantId = paramsOrPlantId;
    if (targetDate) params.targetDate = targetDate;
    if (region) params.region = region;
  }
  return request.get('/forecast/transport', { params });
};

export const getStandbyBoilerRecommendation = (
  paramsOrPlantId?: string | {
    plantId?: string;
    region?: string;
  },
  region?: string
): Promise<{
  shouldStart: boolean;
  recommendedStartDate?: string;
  estimatedDuration: number;
  expectedAdditionalCapacity: number;
  expectedDailyProcessing: number;
  totalExpectedIncrement: number;
  costBenefitAnalysis: string;
  noStartReason?: string;
  forecastSummary: any;
  unitRecommendation?: any;
}> => {
  let params: any = {};
  if (typeof paramsOrPlantId === 'object' && paramsOrPlantId !== null) {
    params = paramsOrPlantId;
  } else {
    if (paramsOrPlantId) params.plantId = paramsOrPlantId;
    if (region) params.region = region;
  }
  return request.get('/forecast/standby', { params });
};

export const uploadSupplyPlan = (
  paramsOrFile: File | {
    plantId: string;
    fileData: string;
  },
  plantId?: string
): Promise<{
  success: boolean;
  regions: any[];
  summary: any;
}> => {
  if (paramsOrFile instanceof File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        request.post('/forecast/upload', {
          plantId: plantId || '',
          fileData: data as string
        }).then(resolve as any).catch(reject);
      };
      reader.onerror = reject;
      reader.readAsBinaryString(paramsOrFile);
    });
  }
  return request.post('/forecast/upload', paramsOrFile);
};
