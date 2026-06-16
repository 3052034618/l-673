import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Trash2, Zap, AlertTriangle, BarChart3, Bell, Settings, LogOut, Truck, Flame, BellRing } from 'lucide-react';
import { usePlantStore } from '../store/plantStore';
import { useAuthStore } from '../store/authStore';
import ProvinceSelector from '../components/ProvinceSelector';
import HeatmapChart from '../components/HeatmapChart';
import RankingList from '../components/RankingList';
import PlantList from '../components/PlantList';
import StatsCard from '../components/StatsCard';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { plants, fetchPlants, fetchProvinceStats, fetchRanking } = usePlantStore();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    fetchPlants();
    fetchProvinceStats();
    fetchRanking('powerPerTon');
  }, []);

  const totalCapacity = useMemo(() => {
    return plants.reduce((sum, p) => sum + p.capacity, 0);
  }, [plants]);

  const runningPlants = useMemo(() => {
    return plants.filter(p => p.status === 'running').length;
  }, [plants]);

  const totalUnits = useMemo(() => {
    return plants.reduce((sum, p) => sum + p.units.length, 0);
  }, [plants]);

  const provinces = useMemo(() => {
    return new Set(plants.map(p => p.province)).size;
  }, [plants]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">垃圾焚烧发电运营监测平台</h1>
                <p className="text-xs text-gray-500">全国运营中心</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 bg-blue-50"
              >
                <BarChart3 className="w-4 h-4" />
                运营看板
              </button>
              <button 
                onClick={() => navigate('/forecast')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Truck className="w-4 h-4" />
                预测调运
              </button>
              <button 
                onClick={() => navigate('/alerts')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <BellRing className="w-4 h-4" />
                预警中心
              </button>
            </nav>

            <div className="flex items-center gap-4 ml-auto">
              <ProvinceSelector />
              
              <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              
              <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                  <p className="text-xs text-gray-500">
                    {user?.role === 'group_admin' ? '系统管理员' : 
                     user?.role === 'region_admin' ? '区域管理员' :
                     user?.role === 'plant_manager' ? '厂长' :
                     user?.role === 'shift_supervisor' ? '值长' : '环保局'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">
                    {user?.name?.charAt(0)}
                  </span>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="运行工厂"
            value={runningPlants}
            unit={`/ ${plants.length} 座`}
            icon={<Factory className="w-6 h-6 text-blue-600" />}
            trend={2.3}
            color="bg-blue-50"
          />
          <StatsCard
            title="日处理能力"
            value={totalCapacity.toLocaleString()}
            unit="吨"
            icon={<Trash2 className="w-6 h-6 text-green-600" />}
            trend={5.1}
            color="bg-green-50"
          />
          <StatsCard
            title="运行机组"
            value={totalUnits}
            unit="台"
            icon={<Zap className="w-6 h-6 text-yellow-600" />}
            trend={1.8}
            color="bg-yellow-50"
          />
          <StatsCard
            title="覆盖省份"
            value={provinces}
            unit="个"
            icon={<BarChart3 className="w-6 h-6 text-purple-600" />}
            color="bg-purple-50"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <HeatmapChart />
          </div>
          <div>
            <RankingList />
          </div>
        </div>

        <PlantList />
      </main>
    </div>
  );
};

export default Dashboard;
