import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Flame, Gauge, Activity, Clock, MapPin, Factory } from 'lucide-react';
import * as echarts from 'echarts';
import { registerChinaMap } from '../lib/echartsInit';
import { plantApi, realtimeApi, alertApi } from '../api';
import type { Plant, RealtimeData, AggregatedData, Alert, MaintenanceRecord } from '../../shared/types';

const PlantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeData[]>([]);
  const [historyData, setHistoryData] = useState<AggregatedData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'emission' | 'maintenance'>('overview');

  const trendChartRef = React.useRef<HTMLDivElement>(null);
  const emissionChartRef = React.useRef<HTMLDivElement>(null);
  const trendChartInstance = React.useRef<echarts.ECharts | null>(null);
  const emissionChartInstance = React.useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    registerChinaMap();
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (historyData.length > 0 && trendChartRef.current) {
      if (!trendChartInstance.current) {
        trendChartInstance.current = echarts.init(trendChartRef.current);
      }
      renderTrendChart();
    }
  }, [historyData]);

  useEffect(() => {
    if (realtimeData.length > 0 && emissionChartRef.current) {
      if (!emissionChartInstance.current) {
        emissionChartInstance.current = echarts.init(emissionChartRef.current);
      }
      renderEmissionChart();
    }
  }, [realtimeData]);

  useEffect(() => {
    const handleResize = () => {
      trendChartInstance.current?.resize();
      emissionChartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [plantData, realtime, history, alertData] = await Promise.all([
        plantApi.getPlantById(id),
        realtimeApi.getPlantRealtime(id),
        realtimeApi.getAggregatedData(id, 'day', 7),
        alertApi.getAlerts({ plantId: id, limit: 20 })
      ]);
      setPlant(plantData);
      setRealtimeData(Array.isArray(realtime) ? realtime : []);
      setHistoryData(Array.isArray(history) ? history : []);
      setAlerts(Array.isArray(alertData) ? alertData : []);
      
      const mockMaintenance: MaintenanceRecord[] = [
        {
          id: '1',
          plantId: id,
          unitId: plantData?.units?.[0]?.id || '',
          type: '常规检修',
          description: '1号炉排片更换',
          startTime: '2025-02-15T08:00:00Z',
          endTime: '2025-02-15T16:00:00Z',
          status: 'completed',
          notes: '更换磨损炉排片20片'
        },
        {
          id: '2',
          plantId: id,
          unitId: plantData?.units?.[1]?.id || '',
          type: '故障维修',
          description: '引风机轴承异响',
          startTime: '2025-02-18T14:30:00Z',
          endTime: '2025-02-18T18:45:00Z',
          status: 'completed',
          notes: '更换SKF轴承1套'
        },
        {
          id: '3',
          plantId: id,
          unitId: plantData?.units?.[0]?.id || '',
          type: '定期维护',
          description: '布袋除尘器检查',
          startTime: '2025-02-22T09:00:00Z',
          status: 'in_progress',
          notes: '检查滤袋破损情况'
        }
      ];
      setMaintenanceRecords(mockMaintenance);
    } catch (error) {
      console.error('Failed to load plant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTrendChart = () => {
    if (!trendChartInstance.current || historyData.length === 0) return;

    const dates = historyData.map(d => d.date);
    const powerData = historyData.map(d => d.totalPower);
    const garbageData = historyData.map(d => d.totalGarbage);
    const powerPerTonData = historyData.map(d => d.powerPerTon);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['发电量', '垃圾处理量', '吨垃圾发电量'],
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { fontSize: 11 }
      },
      yAxis: [
        {
          type: 'value',
          name: '发电量(MWh)/处理量(吨)',
          position: 'left',
          axisLabel: { fontSize: 11 }
        },
        {
          type: 'value',
          name: '吨发电量(kWh/吨)',
          position: 'right',
          axisLabel: { fontSize: 11 }
        }
      ],
      series: [
        {
          name: '发电量',
          type: 'bar',
          data: powerData.map(v => Number(v.toFixed(2))),
          itemStyle: { color: '#3b82f6' },
          barWidth: '25%'
        },
        {
          name: '垃圾处理量',
          type: 'bar',
          data: garbageData.map(v => Number(v.toFixed(2))),
          itemStyle: { color: '#10b981' },
          barWidth: '25%'
        },
        {
          name: '吨垃圾发电量',
          type: 'line',
          yAxisIndex: 1,
          data: powerPerTonData.map(v => Number(v.toFixed(2))),
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 3 },
          symbol: 'circle',
          symbolSize: 8
        }
      ]
    };

    trendChartInstance.current.setOption(option);
  };

  const renderEmissionChart = () => {
    if (!emissionChartInstance.current || realtimeData.length === 0) return;

    const recentData = realtimeData.slice(-50);
    const times = recentData.map(d => {
      const date = new Date(d.timestamp);
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    });
    const so2Data = recentData.map(d => d.so2);
    const noxData = recentData.map(d => d.nox);
    const particulateData = recentData.map(d => d.particulate);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['SO₂', 'NOx', '颗粒物'],
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: { fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        name: '浓度(mg/m³)',
        axisLabel: { fontSize: 11 }
      },
      series: [
        {
          name: 'SO₂',
          type: 'line',
          data: so2Data.map(v => Number(v.toFixed(2))),
          itemStyle: { color: '#ef4444' },
          smooth: true,
          showSymbol: false
        },
        {
          name: 'NOx',
          type: 'line',
          data: noxData.map(v => Number(v.toFixed(2))),
          itemStyle: { color: '#f59e0b' },
          smooth: true,
          showSymbol: false
        },
        {
          name: '颗粒物',
          type: 'line',
          data: particulateData.map(v => Number(v.toFixed(2))),
          itemStyle: { color: '#6366f1' },
          smooth: true,
          showSymbol: false
        }
      ]
    };

    emissionChartInstance.current.setOption(option);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-700';
      case 'stopped': return 'bg-red-100 text-red-700';
      case 'maintenance': return 'bg-yellow-100 text-yellow-700';
      case 'standby': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return '运行中';
      case 'stopped': return '停机';
      case 'maintenance': return '检修中';
      case 'standby': return '备用';
      default: return status;
    }
  };

  const getAlertLevelColor = (level: string) => {
    return level === 'level1' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
  };

  const getAlertLevelText = (level: string) => {
    return level === 'level1' ? '一级预警' : '二级预警';
  };

  if (loading && !plant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">工厂不存在</h2>
          <button
            onClick={() => navigate('/')}
            className="text-blue-500 hover:text-blue-600"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const avgAvailability = historyData.length > 0 
    ? historyData.reduce((sum, d) => sum + d.availabilityRate, 0) / historyData.length 
    : 100;
  const avgCompliance = historyData.length > 0
    ? historyData.reduce((sum, d) => sum + d.complianceRate, 0) / historyData.length
    : 100;
  const avgPowerPerTon = historyData.length > 0
    ? historyData.reduce((sum, d) => sum + d.powerPerTon, 0) / historyData.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回首页</span>
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Factory className="w-6 h-6 text-blue-500" />
                <h1 className="text-xl font-bold text-gray-800">{plant.name}</h1>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plant.status)}`}>
                  {getStatusText(plant.status)}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {plant.province} · {plant.city}
                </span>
                <span>设计日处理量：{plant.capacity} 吨</span>
                <span>机组数量：{plant.units.length} 台</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 text-sm">设备可用率</span>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{avgAvailability.toFixed(1)}%</div>
            <div className="text-xs text-gray-400 mt-1">近7天平均</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 text-sm">排放达标率</span>
              <Gauge className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{avgCompliance.toFixed(1)}%</div>
            <div className="text-xs text-gray-400 mt-1">近7天平均</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 text-sm">吨垃圾发电量</span>
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{avgPowerPerTon.toFixed(1)} kWh</div>
            <div className="text-xs text-gray-400 mt-1">近7天平均</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 text-sm">运行机组</span>
              <Flame className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {plant.units.filter(u => u.status === 'running').length}/{plant.units.length}
            </div>
            <div className="text-xs text-gray-400 mt-1">台数</div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            {(['overview', 'emission', 'maintenance'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'overview' ? '发电趋势' : tab === 'emission' ? '排放监测' : '维修记录'}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">近7天发电趋势</h3>
            <div ref={trendChartRef} className="w-full h-80" />
          </div>
        )}

        {activeTab === 'emission' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">烟气排放浓度分布</h3>
              <div ref={emissionChartRef} className="w-full h-80" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">排放标准限值</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">SO₂ 限值</div>
                  <div className="text-xl font-bold text-red-600">≤ 100 mg/m³</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">NOx 限值</div>
                  <div className="text-xl font-bold text-orange-600">≤ 300 mg/m³</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">颗粒物限值</div>
                  <div className="text-xl font-bold text-purple-600">≤ 20 mg/m³</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">设备维修时间线</h3>
              <div className="space-y-4">
                {maintenanceRecords.map((record, index) => (
                  <div key={record.id} className="relative pl-8 pb-6 border-l-2 border-gray-200 last:pb-0 last:border-l-0">
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full ${
                      record.status === 'completed' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'
                    }`} />
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-800">{record.type}</h4>
                          <p className="text-sm text-gray-600">{record.description}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {record.status === 'completed' ? '已完成' : '进行中'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          开始时间：{new Date(record.startTime).toLocaleString('zh-CN')}
                        </span>
                        {record.endTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            结束时间：{new Date(record.endTime).toLocaleString('zh-CN')}
                          </span>
                        )}
                      </div>
                      {record.notes && (
                        <p className="text-xs text-gray-500 mt-2">备注：{record.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {alerts.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">最近预警</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">时间</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">类型</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">级别</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.slice(0, 10).map(alert => (
                        <tr key={alert.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-800">
                            {new Date(alert.timestamp || '').toLocaleString('zh-CN')}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-800">{alert.type}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertLevelColor(alert.level)}`}>
                              {getAlertLevelText(alert.level)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-800">{alert.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantDetail;
