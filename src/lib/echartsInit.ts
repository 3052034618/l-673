import * as echarts from 'echarts';

const chinaGeoJSON = {
  type: 'FeatureCollection',
  features: []
};

const provinceMap: Record<string, [number, number]> = {
  '黑龙江': [126.66, 45.74],
  '吉林': [125.32, 43.90],
  '辽宁': [123.43, 41.81],
  '内蒙古': [111.67, 40.82],
  '新疆': [87.62, 43.82],
  '西藏': [91.11, 29.97],
  '青海': [101.78, 36.62],
  '甘肃': [103.82, 36.06],
  '宁夏': [106.27, 38.47],
  '陕西': [108.95, 34.27],
  '山西': [112.55, 37.87],
  '河北': [114.48, 38.03],
  '北京': [116.41, 39.91],
  '天津': [117.20, 39.13],
  '山东': [117.00, 36.65],
  '河南': [113.65, 34.76],
  '江苏': [118.78, 32.04],
  '安徽': [117.28, 31.86],
  '浙江': [120.15, 30.28],
  '上海': [121.47, 31.23],
  '湖北': [114.31, 30.52],
  '湖南': [112.98, 28.19],
  '江西': [115.89, 28.68],
  '福建': [119.30, 26.08],
  '台湾': [121.50, 25.03],
  '广东': [113.23, 23.16],
  '广西': [108.33, 22.84],
  '海南': [110.33, 20.07],
  '香港': [114.17, 22.32],
  '澳门': [113.55, 22.19],
  '四川': [104.06, 30.67],
  '重庆': [106.55, 29.56],
  '贵州': [106.71, 26.57],
  '云南': [102.71, 25.04]
};

export const registerChinaMap = () => {
  if (echarts.getMap('china')) return;
  
  const features = Object.entries(provinceMap).map(([name, coords]) => ({
    type: 'Feature' as const,
    properties: { name },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [coords[0] - 3, coords[1] - 2],
        [coords[0] + 3, coords[1] - 2],
        [coords[0] + 3, coords[1] + 2],
        [coords[0] - 3, coords[1] + 2],
        [coords[0] - 3, coords[1] - 2]
      ]]
    }
  }));
  
  chinaGeoJSON.features = features;
  echarts.registerMap('china', chinaGeoJSON as any);
};

export default echarts;
