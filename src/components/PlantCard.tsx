import React from 'react';
import { Factory, MapPin, Activity, Thermometer, Zap, ArrowRight } from 'lucide-react';
import type { Plant } from '../../shared/types';
import { useNavigate } from 'react-router-dom';

interface PlantCardProps {
  plant: Plant;
  realtimeData?: any;
}

const PlantCard: React.FC<PlantCardProps> = ({ plant, realtimeData }) => {
  const navigate = useNavigate();

  const runningUnits = plant.units.filter(u => u.status === 'running').length;
  const totalCapacity = plant.capacity;

  const statusColor = plant.status === 'running' 
    ? 'bg-green-500' 
    : plant.status === 'maintenance' 
      ? 'bg-yellow-500' 
      : 'bg-red-500';

  const statusText = plant.status === 'running' 
    ? '运行中' 
    : plant.status === 'maintenance' 
      ? '维护中' 
      : '停运';

  const handleDrillDown = () => {
    navigate(`/plant/${plant.id}`);
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer group"
      onClick={handleDrillDown}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Factory className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
              {plant.name}
            </h4>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              {plant.province} {plant.city}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
          <span className="text-xs text-gray-600">{statusText}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-gray-800">
            {runningUnits}/{plant.units.length}
          </div>
          <div className="text-xs text-gray-500">运行机组</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-gray-800">
            {totalCapacity}
          </div>
          <div className="text-xs text-gray-500">日产能(吨)</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-gray-800">
            {plant.region}
          </div>
          <div className="text-xs text-gray-500">区域</div>
        </div>
      </div>

      {realtimeData && (
        <div className="flex items-center gap-4 text-xs text-gray-600 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-1">
            <Thermometer className="w-3 h-3 text-orange-500" />
            <span>{realtimeData.furnaceTemp?.toFixed(0)}°C</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span>{(realtimeData.powerGeneration / 1000)?.toFixed(1)}MW</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-green-500" />
            <span>{realtimeData.so2?.toFixed(1)}mg/m³</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end mt-3 text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        查看详情
        <ArrowRight className="w-4 h-4 ml-1" />
      </div>
    </div>
  );
};

export default PlantCard;
