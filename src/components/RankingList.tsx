import React, { useEffect, useState } from 'react';
import { TrendingUp, Zap, Award } from 'lucide-react';
import { usePlantStore } from '../store/plantStore';

type MetricType = 'powerPerTon' | 'complianceRate' | 'availabilityRate';

interface MetricOption {
  value: MetricType;
  label: string;
  unit: string;
  icon: React.ReactNode;
}

const metricOptions: MetricOption[] = [
  { value: 'powerPerTon', label: '吨垃圾发电量', unit: 'kWh/吨', icon: <Zap className="w-4 h-4" /> },
  { value: 'complianceRate', label: '排放达标率', unit: '%', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'availabilityRate', label: '设备可用率', unit: '%', icon: <Award className="w-4 h-4" /> },
];

const RankingList: React.FC = () => {
  const { ranking, fetchRanking, selectedProvince } = usePlantStore();
  const [metric, setMetric] = useState<MetricType>('powerPerTon');

  useEffect(() => {
    fetchRanking(metric);
  }, [metric]);

  const currentMetric = metricOptions.find(m => m.value === metric)!;

  const filteredRanking = ranking.filter(item => {
    if (selectedProvince === 'all') return true;
    if (['华北', '东北', '华东', '华中', '华南', '西南', '西北'].includes(selectedProvince)) {
      return item.region === selectedProvince;
    }
    return item.province === selectedProvince;
  });

  const getRankColor = (index: number) => {
    if (index === 0) return 'bg-yellow-500';
    if (index === 1) return 'bg-gray-400';
    if (index === 2) return 'bg-amber-600';
    return 'bg-blue-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">发电效率排名</h3>
        <div className="flex gap-1">
          {metricOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setMetric(option.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                metric === option.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredRanking.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无排名数据
          </div>
        ) : (
          filteredRanking.slice(0, 10).map((item, index) => (
            <div
              key={item.plantId}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
            >
              <div className={`w-6 h-6 rounded-full ${getRankColor(index)} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate group-hover:text-blue-600">
                  {item.plantName}
                </div>
                <div className="text-xs text-gray-500">
                  {item.province} · {item.region}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-800">
                  {item.value?.toFixed(2)}
                  <span className="text-xs text-gray-500 ml-1">{currentMetric.unit}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RankingList;
