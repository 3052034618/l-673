import React, { useEffect, useMemo, useRef } from 'react';
import echarts, { registerChinaMap } from '../lib/echartsInit';
import { usePlantStore } from '../store/plantStore';

interface HeatmapChartProps {
  className?: string;
}

const HeatmapChart: React.FC<HeatmapChartProps> = ({ className }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { provinceStats, selectedProvince, plants } = usePlantStore();

  const chartData = useMemo(() => {
    if (provinceStats.length > 0) {
      return provinceStats.map(s => ({
        name: s.province.replace('省', '').replace('市', '').replace('自治区', '').replace('壮族', '').replace('回族', '').replace('维吾尔', ''),
        value: s.totalGarbage,
        plantCount: s.plantCount
      }));
    }
    
    const provinceData = new Map<string, { value: number; count: number }>();
    plants.forEach(p => {
      const existing = provinceData.get(p.province) || { value: 0, count: 0 };
      provinceData.set(p.province, {
        value: existing.value + p.capacity,
        count: existing.count + 1
      });
    });
    
    return Array.from(provinceData.entries()).map(([name, data]) => ({
      name: name.replace('省', '').replace('市', '').replace('自治区', '').replace('壮族', '').replace('回族', '').replace('维吾尔', ''),
      value: data.value,
      plantCount: data.count
    }));
  }, [provinceStats, plants]);

  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 1000;
    return Math.max(...chartData.map(d => d.value));
  }, [chartData]);

  useEffect(() => {
    if (!chartRef.current) return;

    registerChinaMap();

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const data = chartData.find(d => d.name === params.name);
          return `
            <div class="font-medium">${params.name}</div>
            <div>日处理量: ${params.value?.toLocaleString() || 0} 吨</div>
            <div>工厂数量: ${data?.plantCount || 0} 座</div>
          `;
        }
      },
      visualMap: {
        min: 0,
        max: maxValue,
        left: 'left',
        top: 'bottom',
        text: ['高', '低'],
        calculable: true,
        inRange: {
          color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']
        }
      },
      geo: {
        map: 'china',
        roam: true,
        zoom: 1.2,
        label: {
          show: true,
          fontSize: 10,
          color: '#333'
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1,
          areaColor: '#f5f5f5'
        },
        emphasis: {
          itemStyle: {
            areaColor: '#ffd700'
          },
          label: {
            color: '#333'
          }
        }
      },
      series: [
        {
          name: '日处理量',
          type: 'map',
          map: 'china',
          geoIndex: 0,
          data: chartData
        }
      ]
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chartData, maxValue]);

  useEffect(() => {
    if (selectedProvince !== 'all' && chartInstance.current) {
      const targetName = selectedProvince.replace('省', '').replace('市', '').replace('自治区', '').replace('壮族', '').replace('回族', '').replace('维吾尔', '');
      chartInstance.current.dispatchAction({
        type: 'highlight',
        name: targetName
      });
    }
  }, [selectedProvince]);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">全国垃圾处理量热力图</h3>
      <div ref={chartRef} className="w-full h-96" />
    </div>
  );
};

export default HeatmapChart;
