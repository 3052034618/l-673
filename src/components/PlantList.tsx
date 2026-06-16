import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { usePlantStore } from '../store/plantStore';
import { getCurrentRealtimeData } from '../api/realtime';
import PlantCard from './PlantCard';
import type { RealtimeData } from '../../shared/types';

const PlantList: React.FC = () => {
  const { plants, selectedProvince, fetchPlants } = usePlantStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [realtimeDataMap, setRealtimeDataMap] = useState<Map<string, RealtimeData>>(new Map());

  useEffect(() => {
    fetchPlants();
  }, []);

  useEffect(() => {
    const fetchRealtime = async () => {
      try {
        const data = await getCurrentRealtimeData();
        const map = new Map<string, RealtimeData>();
        data.forEach(d => map.set(d.plantId, d));
        setRealtimeDataMap(map);
      } catch (e) {
        console.error('Failed to fetch realtime data:', e);
      }
    };

    fetchRealtime();
    const interval = setInterval(fetchRealtime, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredPlants = plants.filter(plant => {
    const matchesProvince = selectedProvince === 'all' 
      ? true 
      : ['华北', '东北', '华东', '华中', '华南', '西南', '西北'].includes(selectedProvince)
        ? plant.region === selectedProvince
        : plant.province === selectedProvince;
    
    const matchesSearch = plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plant.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesProvince && matchesSearch;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          工厂列表
          <span className="ml-2 text-sm font-normal text-gray-500">
            共 {filteredPlants.length} 座
          </span>
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索工厂名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPlants.map(plant => (
          <PlantCard
            key={plant.id}
            plant={plant}
            realtimeData={realtimeDataMap.get(plant.id)}
          />
        ))}
      </div>

      {filteredPlants.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          暂无符合条件的工厂
        </div>
      )}
    </div>
  );
};

export default PlantList;
