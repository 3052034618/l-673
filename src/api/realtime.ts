import request from './request';
import type { RealtimeData, AggregatedData, PeriodType } from '../../shared/types';

export const getCurrentRealtimeData = (plantId?: string, unitId?: string): Promise<RealtimeData[]> => {
  const params: any = {};
  if (plantId) params.plantId = plantId;
  if (unitId) params.unitId = unitId;
  return request.get('/realtime/current', { params });
};

export const getPlantRealtime = (plantId: string): Promise<RealtimeData[]> => {
  return request.get(`/realtime/current?plantId=${plantId}`);
};

export const getRealtimeHistory = (params: {
  plantId: string;
  startDate?: string;
  endDate?: string;
  unitId?: string;
}): Promise<RealtimeData[]> => {
  return request.get('/realtime/history', { params });
};

export const getAggregatedData = (
  paramsOrPlantId: string | {
    plantId: string;
    period: PeriodType;
    startDate?: string;
    endDate?: string;
  },
  period?: PeriodType,
  days?: number
): Promise<AggregatedData[]> => {
  if (typeof paramsOrPlantId === 'string') {
    const params: any = {
      plantId: paramsOrPlantId,
      period: period || 'day'
    };
    if (days) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      params.startDate = startDate.toISOString().split('T')[0];
      params.endDate = endDate.toISOString().split('T')[0];
    }
    return request.get('/realtime/aggregated', { params });
  }
  return request.get('/realtime/aggregated', { params: paramsOrPlantId });
};
