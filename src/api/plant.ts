import request from './request';
import type { Plant, ProvinceStats, PlantRankingItem } from '../../shared/types';

export const getPlants = (): Promise<Plant[]> => {
  return request.get('/plants');
};

export const getAllPlants = (): Promise<Plant[]> => {
  return request.get('/plants');
};

export const getPlantById = (id: string): Promise<Plant> => {
  return request.get(`/plants/${id}`);
};

export const getProvinceStats = (): Promise<ProvinceStats[]> => {
  return request.get('/plants/province-stats');
};

export const getPlantRanking = (metric: string = 'powerPerTon'): Promise<PlantRankingItem[]> => {
  return request.get(`/plants/ranking?metric=${metric}`);
};

export const getPlantSummary = (plantId: string): Promise<any> => {
  return request.get(`/plants/${plantId}/summary`);
};
