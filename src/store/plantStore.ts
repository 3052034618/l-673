import { create } from 'zustand';
import type { Plant, ProvinceStats, PlantRankingItem } from '../../shared/types';
import { getPlants, getProvinceStats, getPlantRanking, getPlantSummary } from '../api/plant';

interface PlantState {
  plants: Plant[];
  provinceStats: ProvinceStats[];
  ranking: PlantRankingItem[];
  selectedProvince: string;
  selectedPlant: Plant | null;
  loading: boolean;
  error: string | null;
  fetchPlants: () => Promise<void>;
  fetchProvinceStats: () => Promise<void>;
  fetchRanking: (metric?: string) => Promise<void>;
  fetchPlantSummary: (plantId: string) => Promise<any>;
  setSelectedProvince: (province: string) => void;
  setSelectedPlant: (plant: Plant | null) => void;
}

export const usePlantStore = create<PlantState>((set, get) => ({
  plants: [],
  provinceStats: [],
  ranking: [],
  selectedProvince: 'all',
  selectedPlant: null,
  loading: false,
  error: null,

  fetchPlants: async () => {
    set({ loading: true });
    try {
      const plants = await getPlants();
      set({ plants, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchProvinceStats: async () => {
    set({ loading: true });
    try {
      const stats = await getProvinceStats();
      set({ provinceStats: stats, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchRanking: async (metric: string = 'powerPerTon') => {
    set({ loading: true });
    try {
      const ranking = await getPlantRanking(metric);
      set({ ranking, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchPlantSummary: async (plantId: string) => {
    set({ loading: true });
    try {
      const summary = await getPlantSummary(plantId);
      set({ loading: false });
      return summary;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  setSelectedProvince: (province: string) => set({ selectedProvince: province }),

  setSelectedPlant: (plant: Plant | null) => set({ selectedPlant: plant }),
}));
