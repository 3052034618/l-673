import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { TrendingDown, TrendingUp, Upload, Flame, AlertTriangle, CheckCircle, Clock, DollarSign, ArrowRight, BarChart3, Truck, Settings } from 'lucide-react';
import * as echarts from 'echarts';
import { forecastApi, plantApi } from '../api';
import type { ForecastResult, Plant } from '../../shared/types';

interface TransportRoute {
  sourcePlantId: string;
  sourcePlantName: string;
  distance: number;
  transportAmount: number;
  cost: number;
  priority: number;
}

interface TransportPlan {
  hasGap: boolean;
  totalGap: number;
  totalTransportAmount: number;
  totalCost: number;
  sourcePlants: Array<{
    plantId: string;
    plantName: string;
    availableCapacity: number;
    maxTransportAmount: number;
  }>;
  transportRoutes: TransportRoute[];
  summary: string[];
}

interface BoilerRecommendation {
  shouldStart: boolean;
  recommendedStartDate?: string;
  noStartReason?: string;
  expectedIncrement: number;
  costBenefitAnalysis: {
    cost: number;
    benefit: number;
    roiDays: number;
  };
  summary: string[];
}

const Forecast: React.FC = () => {
  const { plantId } = useParams<{ plantId?: string }>();
  const [selectedPlant, setSelectedPlant] = useState<string>(plantId || '');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [forecastData, setForecastData] = useState<{ forecast: ForecastResult[]; summary: { avgSupply: number; avgCapacity: number; avgGap: number; maxGap: number; totalGapDays: number } } | null>(null);
  const [transportPlan, setTransportPlan] = useState<TransportPlan | null>(null);
  const [boilerRecommendation, setBoilerRecommendation] = useState<BoilerRecommendation | null>(null);
  const [activeTab, setActiveTab] = useState<'gap' | 'transport' | 'boiler'>('gap');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    loadPlants();
  }, []);

  useEffect(() => {
    if (selectedPlant || selectedRegion) {
      loadForecastData();
    }
  }, [selectedPlant, selectedRegion]);

  useEffect(() => {
    if (forecastData && chartRef.current) {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }
      renderGapChart();
    }
  }, [forecastData]);

  useEffect(() => {
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadPlants = async () => {
    try {
      const data = await plantApi.getAllPlants();
      setPlants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load plants:', error);
    }
  };

  const loadForecastData = async () => {
    if (!selectedPlant && !selectedRegion) return;
    
    try {
      setLoading(true);
      const [forecast, transport, boiler] = await Promise.all([
        forecastApi.getGapForecast(selectedPlant || undefined, 30, selectedRegion || undefined),
        forecastApi.getOptimalTransportPlan(selectedPlant || undefined, undefined, selectedRegion || undefined),
        forecastApi.getStandbyBoilerRecommendation(selectedPlant || undefined, selectedRegion || undefined)
      ]);
      setForecastData(forecast as any);
      setTransportPlan(transport as any);
      setBoilerRecommendation(boiler as any);
    } catch (error) {
      console.error('Failed to load forecast data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderGapChart = () => {
    if (!chartInstance.current || !forecastData) return;

    const dates = forecastData.forecast.map(d => d.date);
    const supplyData = forecastData.forecast.map(d => d.supply);
    const capacityData = forecastData.forecast.map(d => d.capacity);
    const gapData = forecastData.forecast.map(d => d.gap);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          let html = `<div class="font-medium">${params[0].axisValue}</div>`;
          params.forEach((param: any) => {
            html += `<div class="flex items-center gap-2 mt-1">
              <span class="w-2 h-2 rounded-full" style="background:${param.color}"></span>
              <span>${param.seriesName}:</span>
              <span class="font-medium">${param.value} 吨</span>
            </div>`;
          });
          return html;
        }
      },
      legend: {
        data: ['供应量', '处理能力', '缺口'],
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '12%',
        containLabel: true
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          start: 0,
          end: 100,
          height: 20,
          bottom: 0
        }
      ],
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { fontSize: 10, rotate: 45 }
      },
      yAxis: {
        type: 'value',
        name: '吨/天',
        axisLabel: { fontSize: 11 }
      },
      series: [
        {
          name: '供应量',
          type: 'bar',
          data: supplyData,
          itemStyle: { color: '#10b981' },
          barWidth: '30%'
        },
        {
          name: '处理能力',
          type: 'bar',
          data: capacityData,
          itemStyle: { color: '#3b82f6' },
          barWidth: '30%'
        },
        {
          name: '缺口',
          type: 'line',
          data: gapData,
          itemStyle: { color: '#ef4444' },
          lineStyle: { width: 3 },
          symbol: 'circle',
          symbolSize: 6,
          markLine: {
            silent: true,
            lineStyle: { color: '#ef4444', type: 'dashed' },
            data: [{ yAxis: 0, label: { formatter: '警戒线', position: 'end' } }]
          }
        }
      ]
    };

    chartInstance.current.setOption(option);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await forecastApi.uploadSupplyPlan(file);
      await loadForecastData();
      alert('Excel上传成功，预测数据已更新！');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('上传失败，请检查文件格式');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-700';
      case 2: return 'bg-orange-100 text-orange-700';
      case 3: return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">处置缺口预测与调运方案</h1>
            <p className="text-gray-500 mt-1">基于30天预测数据，自动推荐最优调运方案和备用炉启动建议</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {uploading ? '上传中...' : '上传月度供应计划'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">选择工厂</label>
              <select
                value={selectedPlant}
                onChange={(e) => {
                  setSelectedPlant(e.target.value);
                  setSelectedRegion('');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- 请选择工厂 --</option>
                {plants.map(plant => (
                  <option key={plant.id} value={plant.id}>{plant.name}</option>
                ))}
              </select>
            </div>
            <div className="text-gray-400 font-medium">或</div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">选择区域</label>
              <select
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedPlant('');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- 请选择区域 --</option>
                {['华北', '东北', '华东', '华中', '华南', '西南', '西北'].map(region => (
                  <option key={region} value={region}>{region}区域</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!selectedPlant && !selectedRegion ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">请选择工厂或区域</h3>
            <p className="text-gray-400">选择后即可查看30天处置缺口预测和调运方案</p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">加载预测数据中...</p>
          </div>
        ) : (
          <>
            {forecastData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-500 text-sm">日均供应量</span>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{forecastData.summary.avgSupply.toFixed(0)} 吨</div>
                  <div className="text-xs text-gray-400 mt-1">未来30天平均</div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-500 text-sm">日均处理能力</span>
                    <Flame className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{forecastData.summary.avgCapacity.toFixed(0)} 吨</div>
                  <div className="text-xs text-gray-400 mt-1">未来30天平均</div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-500 text-sm">日均缺口</span>
                    <TrendingDown className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className={`text-2xl font-bold ${forecastData.summary.avgGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {forecastData.summary.avgGap.toFixed(0)} 吨
                  </div>
                  <div className="text-xs text-gray-400 mt-1">未来30天平均</div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-500 text-sm">最大缺口</span>
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{forecastData.summary.maxGap.toFixed(0)} 吨</div>
                  <div className="text-xs text-gray-400 mt-1">{forecastData.summary.totalGapDays} 天存在缺口</div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="flex gap-2 border-b border-gray-200">
                {([
                  { key: 'gap', label: '缺口预测', icon: BarChart3 },
                  { key: 'transport', label: '最优调运方案', icon: Truck },
                  { key: 'boiler', label: '备用炉建议', icon: Settings }
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 -mb-px text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'gap' && forecastData && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">未来30天处置缺口预测</h3>
                  <div ref={chartRef} className="w-full h-96" />
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">汇总建议</h3>
                  <div className="space-y-3">
                    {forecastData.forecast.slice(0, 5).map((item, index) => (
                      item.recommendations.length > 0 && (
                        <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-medium text-gray-800">{item.date}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              缺口 {item.gap.toFixed(0)} 吨：{item.recommendations.join('；')}
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transport' && transportPlan && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-800">最优调运方案</h3>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-800">{transportPlan.totalGap.toFixed(0)}</div>
                        <div className="text-xs text-gray-500">总缺口(吨)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{transportPlan.totalTransportAmount.toFixed(0)}</div>
                        <div className="text-xs text-gray-500">可调运量(吨)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">¥{transportPlan.totalCost.toFixed(0)}</div>
                        <div className="text-xs text-gray-500">预计成本</div>
                      </div>
                    </div>
                  </div>

                  {!transportPlan.hasGap ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-gray-600">预测期内无处置缺口，无需调运</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">可调出工厂</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {transportPlan.sourcePlants.map((plant, index) => (
                            <div key={plant.plantId} className="p-4 bg-gray-50 rounded-lg">
                              <div className="font-medium text-gray-800">{plant.plantName}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                可用能力：{plant.availableCapacity.toFixed(0)} 吨
                              </div>
                              <div className="text-sm text-gray-500">
                                最大可调出：{plant.maxTransportAmount.toFixed(0)} 吨
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <h4 className="text-sm font-medium text-gray-700 mb-3">调运路线</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">优先级</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">调出工厂</th>
                              <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">距离</th>
                              <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">调运量</th>
                              <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">成本</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">路径</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transportPlan.transportRoutes.map((route, index) => (
                              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(route.priority)}`}>
                                    P{route.priority}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-800 font-medium">{route.sourcePlantName}</td>
                                <td className="py-3 px-4 text-center text-sm text-gray-600">{route.distance} km</td>
                                <td className="py-3 px-4 text-center text-sm text-gray-800 font-medium">{route.transportAmount.toFixed(0)} 吨</td>
                                <td className="py-3 px-4 text-center text-sm text-orange-600 font-medium">¥{route.cost.toFixed(0)}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>{route.sourcePlantName}</span>
                                    <ArrowRight className="w-4 h-4" />
                                    <span>目标工厂</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {transportPlan.summary.length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h4 className="text-sm font-medium text-blue-800 mb-3">方案摘要</h4>
                    <ul className="space-y-2">
                      {transportPlan.summary.map((item, index) => (
                        <li key={index} className="text-sm text-blue-700 flex items-start gap-2">
                          <span className="text-blue-400">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'boiler' && boilerRecommendation && (
              <div className="space-y-6">
                <div className={`rounded-xl p-6 ${
                  boilerRecommendation.shouldStart 
                    ? 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200' 
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      boilerRecommendation.shouldStart ? 'bg-orange-500' : 'bg-green-500'
                    }`}>
                      <Flame className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {boilerRecommendation.shouldStart ? '建议启动备用炉' : '无需启动备用炉'}
                      </h3>
                      {boilerRecommendation.shouldStart ? (
                        <>
                          <p className="text-orange-700 mb-2">
                            <Clock className="w-4 h-4 inline mr-1" />
                            建议启动日期：{boilerRecommendation.recommendedStartDate}
                          </p>
                          <p className="text-orange-700">
                            预计新增处理能力：{boilerRecommendation.expectedIncrement.toFixed(0)} 吨/天
                          </p>
                        </>
                      ) : (
                        <p className="text-green-700">{boilerRecommendation.noStartReason}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">成本效益分析</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-red-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">启动成本</div>
                      <div className="text-2xl font-bold text-red-600">
                        ¥{boilerRecommendation.costBenefitAnalysis.cost.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">含燃料、人工、折旧</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">预计收益</div>
                      <div className="text-2xl font-bold text-green-600">
                        ¥{boilerRecommendation.costBenefitAnalysis.benefit.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">避免的处理费损失</div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">投资回收期</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {boilerRecommendation.costBenefitAnalysis.roiDays.toFixed(1)} 天
                      </div>
                      <div className="text-xs text-gray-500 mt-1">成本回收周期</div>
                    </div>
                  </div>
                </div>

                {boilerRecommendation.summary.length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h4 className="text-sm font-medium text-blue-800 mb-3">决策建议</h4>
                    <ul className="space-y-2">
                      {boilerRecommendation.summary.map((item, index) => (
                        <li key={index} className="text-sm text-blue-700 flex items-start gap-2">
                          <span className="text-blue-400">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Forecast;
