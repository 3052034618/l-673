import bcrypt from 'bcryptjs';
import { db, generateId } from './memoryStore.js';
import type {
  User,
  Plant,
  Unit,
  RealtimeData,
  AggregatedData,
  Alert,
  Approval,
  WeeklyReport,
  MaintenanceRecord,
} from '../../shared/types.js';

const provinces = [
  '北京市', '天津市', '河北省', '山西省', '内蒙古自治区',
  '辽宁省', '吉林省', '黑龙江省', '上海市', '江苏省',
  '浙江省', '安徽省', '福建省', '江西省', '山东省',
  '河南省', '湖北省', '湖南省', '广东省', '广西壮族自治区',
  '海南省', '重庆市', '四川省', '贵州省', '云南省',
  '西藏自治区', '陕西省', '甘肃省', '青海省', '宁夏回族自治区',
  '新疆维吾尔自治区'
];

const cityMap: Record<string, string[]> = {
  '北京市': ['北京市'],
  '天津市': ['天津市'],
  '河北省': ['石家庄', '唐山', '秦皇岛', '邯郸', '保定'],
  '山西省': ['太原', '大同', '阳泉', '长治', '晋城'],
  '内蒙古自治区': ['呼和浩特', '包头', '乌海', '赤峰', '通辽'],
  '辽宁省': ['沈阳', '大连', '鞍山', '抚顺', '本溪'],
  '吉林省': ['长春', '吉林', '四平', '辽源', '通化'],
  '黑龙江省': ['哈尔滨', '齐齐哈尔', '鸡西', '鹤岗', '双鸭山'],
  '上海市': ['上海市'],
  '江苏省': ['南京', '无锡', '徐州', '常州', '苏州'],
  '浙江省': ['杭州', '宁波', '温州', '嘉兴', '湖州'],
  '安徽省': ['合肥', '芜湖', '蚌埠', '淮南', '马鞍山'],
  '福建省': ['福州', '厦门', '莆田', '三明', '泉州'],
  '江西省': ['南昌', '景德镇', '萍乡', '九江', '新余'],
  '山东省': ['济南', '青岛', '淄博', '枣庄', '东营'],
  '河南省': ['郑州', '开封', '洛阳', '平顶山', '安阳'],
  '湖北省': ['武汉', '黄石', '十堰', '宜昌', '襄阳'],
  '湖南省': ['长沙', '株洲', '湘潭', '衡阳', '邵阳'],
  '广东省': ['广州', '深圳', '珠海', '汕头', '佛山'],
  '广西壮族自治区': ['南宁', '柳州', '桂林', '梧州', '北海'],
  '海南省': ['海口', '三亚', '三沙', '儋州'],
  '重庆市': ['重庆市'],
  '四川省': ['成都', '自贡', '攀枝花', '泸州', '德阳'],
  '贵州省': ['贵阳', '六盘水', '遵义', '安顺', '毕节'],
  '云南省': ['昆明', '曲靖', '玉溪', '保山', '昭通'],
  '西藏自治区': ['拉萨', '日喀则', '昌都', '林芝', '山南'],
  '陕西省': ['西安', '铜川', '宝鸡', '咸阳', '渭南'],
  '甘肃省': ['兰州', '嘉峪关', '金昌', '白银', '天水'],
  '青海省': ['西宁', '海东'],
  '宁夏回族自治区': ['银川', '石嘴山', '吴忠', '固原', '中卫'],
  '新疆维吾尔自治区': ['乌鲁木齐', '克拉玛依', '吐鲁番', '哈密']
};

const plantNames = [
  '绿色动力', '光大环境', '康恒环境', '三峰环境', '伟明环保',
  '瀚蓝环境', '高能环境', '东江环保', '雪浪环境', '中环环保',
  '华光股份', '杭锅股份', '海陆重工', '盛运环保', '泰达股份'
];

const generateRandom = (min: number, max: number, decimals = 2): number => {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
};

const generateUsers = (): User[] => {
  const hash = bcrypt.hashSync('123456', 10);
  return [
    {
      id: generateId(),
      username: 'admin',
      name: '系统管理员',
      role: 'group_admin',
      permissions: ['all']
    },
    {
      id: generateId(),
      username: 'region_henan',
      name: '河南区域管理员',
      role: 'region_admin',
      region: '河南省',
      permissions: ['view_region', 'manage_region_users']
    },
    {
      id: generateId(),
      username: 'region_guangdong',
      name: '广东区域管理员',
      role: 'region_admin',
      region: '广东省',
      permissions: ['view_region', 'manage_region_users']
    },
    {
      id: generateId(),
      username: 'shift_zhang',
      name: '张值长',
      role: 'shift_supervisor',
      plantId: '',
      permissions: ['view_plant', 'handle_alert', 'confirm_approval']
    },
    {
      id: generateId(),
      username: 'manager_li',
      name: '李厂长',
      role: 'plant_manager',
      plantId: '',
      permissions: ['view_plant', 'review_approval', 'manage_plant']
    },
    {
      id: generateId(),
      username: 'epb_wang',
      name: '王督察',
      role: 'epb',
      region: '河南省',
      permissions: ['view_emission', 'approve_shutdown']
    }
  ].map(u => ({ ...u, password_hash: hash })) as User[];
};

const generatePlants = (): { plants: Plant[]; units: Unit[] } => {
  const plants: Plant[] = [];
  const units: Unit[] = [];
  const selectedProvinces = provinces.filter(p => cityMap[p].length > 0).slice(0, 20);
  
  selectedProvinces.forEach((province, pIndex) => {
    const cities = cityMap[province];
    const plantCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < plantCount; i++) {
      const plantId = generateId();
      const city = cities[i % cities.length];
      const plantName = `${plantNames[(pIndex + i) % plantNames.length]}${city}垃圾焚烧发电厂`;
      const unitCount = Math.floor(Math.random() * 2) + 2;
      const plantUnits: Unit[] = [];
      
      for (let j = 0; j < unitCount; j++) {
        const unitId = generateId();
        const unit: Unit = {
          id: unitId,
          plantId,
          name: `${j + 1}#机组`,
          capacity: generateRandom(300, 750, 0),
          status: Math.random() > 0.1 ? 'running' : (Math.random() > 0.5 ? 'stopped' : 'standby'),
          createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
        };
        units.push(unit);
        plantUnits.push(unit);
      }
      
      const plant: Plant = {
        id: plantId,
        name: plantName,
        province,
        city,
        address: `${city}XX区XX路${Math.floor(Math.random() * 1000)}号`,
        capacity: plantUnits.reduce((sum, u) => sum + u.capacity, 0),
        units: plantUnits,
        status: plantUnits.some(u => u.status === 'running') ? 'running' : 'stopped',
        lng: generateRandom(73, 135, 4),
        lat: generateRandom(18, 53, 4),
        createdAt: new Date(Date.now() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000).toISOString()
      };
      plants.push(plant);
    }
  });
  
  return { plants, units };
};

const generateRealtimeData = (plants: Plant[], units: Unit[]): RealtimeData[] => {
  const data: RealtimeData[] = [];
  const now = Date.now();
  
  units.forEach(unit => {
    const plant = plants.find(p => p.id === unit.plantId)!;
    for (let i = 0; i < 2016; i++) {
      const timestamp = new Date(now - (2015 - i) * 5 * 60 * 1000);
      const isEmissionAlert = Math.random() < 0.02;
      const isTempAlert = Math.random() < 0.01;
      
      data.push({
        id: generateId(),
        plantId: plant.id,
        unitId: unit.id,
        timestamp: timestamp.toISOString(),
        furnaceTemp: isTempAlert ? generateRandom(1200, 1400) : generateRandom(850, 1050),
        steamPressure: generateRandom(3.5, 5.5),
        powerGeneration: generateRandom(unit.capacity * 0.6, unit.capacity * 0.95),
        so2: isEmissionAlert ? generateRandom(100, 200) : generateRandom(20, 80),
        nox: isEmissionAlert ? generateRandom(300, 500) : generateRandom(80, 250),
        particulate: isEmissionAlert ? generateRandom(20, 50) : generateRandom(3, 15),
        garbageInput: generateRandom(unit.capacity * 0.25, unit.capacity * 0.35)
      });
    }
  });
  
  return data;
};

const generateAggregatedData = (plants: Plant[]): AggregatedData[] => {
  const data: AggregatedData[] = [];
  const now = new Date();
  
  plants.forEach(plant => {
    for (let i = 0; i < 90; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const totalGarbage = generateRandom(plant.capacity * 0.8, plant.capacity * 1.1);
      const totalPower = generateRandom(plant.capacity * 350, plant.capacity * 500);
      
      data.push({
        id: generateId(),
        plantId: plant.id,
        date: date.toISOString().split('T')[0],
        period: 'day',
        totalGarbage,
        totalPower,
        powerPerTon: totalPower / totalGarbage,
        complianceRate: generateRandom(92, 100),
        availabilityRate: generateRandom(88, 100),
        ignitionLossRate: generateRandom(2, 5)
      });
    }
  });
  
  return data;
};

const generateAlerts = (plants: Plant[], units: Unit[]): Alert[] => {
  const alerts: Alert[] = [];
  const now = Date.now();
  
  for (let i = 0; i < 15; i++) {
    const plant = plants[Math.floor(Math.random() * plants.length)];
    const unit = units.filter(u => u.plantId === plant.id)[Math.floor(Math.random() * 2)];
    if (!unit) continue;
    
    const isLevel2 = Math.random() < 0.3;
    const types: Alert['type'][] = ['emission', 'availability', 'temperature', 'pressure'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let message = '';
    let threshold = 0;
    let actualValue = 0;
    
    switch (type) {
      case 'emission':
        message = `${unit.name}烟气排放浓度连续超标`;
        threshold = 100;
        actualValue = generateRandom(120, 200);
        break;
      case 'availability':
        message = `${plant.name}设备可用率低于85%`;
        threshold = 85;
        actualValue = generateRandom(70, 84);
        break;
      case 'temperature':
        message = `${unit.name}炉温异常`;
        threshold = 1100;
        actualValue = generateRandom(1150, 1300);
        break;
      case 'pressure':
        message = `${unit.name}蒸汽压力异常`;
        threshold = 5.5;
        actualValue = generateRandom(5.8, 6.5);
        break;
    }
    
    const startTime = new Date(now - Math.random() * 5 * 60 * 60 * 1000);
    const isActive = Math.random() > 0.4;
    
    alerts.push({
      id: generateId(),
      plantId: plant.id,
      unitId: unit.id,
      type,
      level: isLevel2 ? 'level2' : 'level1',
      status: isActive ? (Math.random() > 0.5 ? 'active' : 'acknowledged') : 'resolved',
      message,
      startTime: startTime.toISOString(),
      endTime: isActive ? undefined : new Date(startTime.getTime() + Math.random() * 2 * 60 * 60 * 1000).toISOString(),
      duration: Math.floor(Math.random() * 180) + 10,
      threshold,
      actualValue,
      handlerNote: isActive ? undefined : '已调整燃烧参数，排放恢复正常'
    });
  }
  
  return alerts;
};

const generateApprovals = (alerts: Alert[], users: User[]): Approval[] => {
  const approvals: Approval[] = [];
  const activeAlerts = alerts.filter(a => a.status !== 'resolved' && a.level === 'level2');
  
  activeAlerts.slice(0, 5).forEach(alert => {
    const shiftUser = users.find(u => u.role === 'shift_supervisor')!;
    const managerUser = users.find(u => u.role === 'plant_manager')!;
    const epbUser = users.find(u => u.role === 'epb')!;
    
    const currentStep = Math.floor(Math.random() * 3) + 1;
    const steps = [
      {
        id: generateId(),
        step: 1,
        role: 'shift_supervisor' as const,
        status: currentStep > 1 ? 'approved' : 'pending',
        approverId: currentStep > 1 ? shiftUser.id : undefined,
        approverName: currentStep > 1 ? shiftUser.name : undefined,
        comment: currentStep > 1 ? '情况属实，建议调整参数' : undefined,
        approvedAt: currentStep > 1 ? new Date().toISOString() : undefined
      },
      {
        id: generateId(),
        step: 2,
        role: 'plant_manager' as const,
        status: currentStep > 2 ? 'approved' : (currentStep === 2 ? 'pending' : 'pending'),
        approverId: currentStep > 2 ? managerUser.id : undefined,
        approverName: currentStep > 2 ? managerUser.name : undefined,
        comment: currentStep > 2 ? '同意调整，密切监控' : undefined,
        approvedAt: currentStep > 2 ? new Date().toISOString() : undefined
      },
      {
        id: generateId(),
        step: 3,
        role: 'epb' as const,
        status: currentStep === 3 ? 'pending' : 'pending',
        approverId: undefined,
        approverName: undefined,
        comment: undefined,
        approvedAt: undefined
      }
    ];
    
    let status: Approval['status'] = 'pending_shift';
    if (currentStep === 2) status = 'pending_manager';
    else if (currentStep === 3) status = 'pending_epb';
    else if (currentStep > 3) status = 'approved';
    
    approvals.push({
      id: generateId(),
      alertId: alert.id,
      plantId: alert.plantId,
      type: Math.random() > 0.5 ? 'parameter_adjust' : 'shutdown',
      status,
      currentStep,
      steps,
      createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
  
  return approvals;
};

const generateWeeklyReports = (plants: Plant[]): WeeklyReport[] => {
  const reports: WeeklyReport[] = [];
  const now = new Date();
  
  for (let week = 0; week < 4; week++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - week * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    
    const ranking = plants
      .map(p => ({
        plantId: p.id,
        plantName: p.name,
        value: generateRandom(400, 600)
      }))
      .sort((a, b) => b.value - a.value);
    
    reports.push({
      id: generateId(),
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      totalPower: plants.reduce((sum, p) => sum + generateRandom(p.capacity * 2000, p.capacity * 3500), 0),
      powerYoY: generateRandom(-5, 15),
      powerMoM: generateRandom(-3, 10),
      complianceRate: generateRandom(94, 99),
      failureRate: generateRandom(0.5, 3),
      powerPerTonRanking: ranking,
      optimizationSuggestions: [
        '建议优化1#机组燃烧控制参数，提升吨垃圾发电量',
        '2#机组烟气处理系统需进行预防性维护',
        '建议增加垃圾仓搅拌频率，改善垃圾热值稳定性',
        '考虑在低负荷时段优化蒸汽参数，提高发电效率'
      ],
      createdAt: weekEnd.toISOString()
    });
  }
  
  plants.slice(0, 10).forEach(plant => {
    const weekEnd = new Date(now);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    
    reports.push({
      id: generateId(),
      plantId: plant.id,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      totalPower: generateRandom(plant.capacity * 2000, plant.capacity * 3500),
      powerYoY: generateRandom(-5, 15),
      powerMoM: generateRandom(-3, 10),
      complianceRate: generateRandom(94, 99),
      failureRate: generateRandom(0.5, 3),
      powerPerTonRanking: [],
      optimizationSuggestions: [
        `建议优化${plant.units[0]?.name || '1#机组'}燃烧控制参数`,
        '定期检查烟气在线监测系统校准情况',
        '建议开展一次全面的设备预防性维护'
      ],
      createdAt: weekEnd.toISOString()
    });
  });
  
  return reports;
};

const generateMaintenanceRecords = (plants: Plant[], units: Unit[]): MaintenanceRecord[] => {
  const records: MaintenanceRecord[] = [];
  const now = Date.now();
  
  for (let i = 0; i < 30; i++) {
    const plant = plants[Math.floor(Math.random() * plants.length)];
    const unit = units.filter(u => u.plantId === plant.id)[Math.floor(Math.random() * 2)];
    if (!unit) continue;
    
    const types = ['例行保养', '故障维修', '年度检修', '技术改造', '部件更换'];
    const type = types[Math.floor(Math.random() * types.length)];
    const startTime = new Date(now - Math.random() * 90 * 24 * 60 * 60 * 1000);
    const duration = Math.floor(Math.random() * 48) + 2;
    const isCompleted = Math.random() > 0.2;
    
    records.push({
      id: generateId(),
      plantId: plant.id,
      unitId: unit.id,
      type,
      description: `${unit.name}${type}作业`,
      startTime: startTime.toISOString(),
      endTime: isCompleted ? new Date(startTime.getTime() + duration * 60 * 60 * 1000).toISOString() : undefined,
      status: isCompleted ? 'completed' : (Math.random() > 0.5 ? 'in_progress' : 'scheduled'),
      notes: isCompleted ? '作业完成，设备运行正常' : '待执行'
    });
  }
  
  return records;
};

export const initializeMockData = (): void => {
  const users = generateUsers();
  const { plants, units } = generatePlants();
  
  users[3].plantId = plants[0].id;
  users[4].plantId = plants[0].id;
  
  db.users = users;
  db.plants = plants;
  db.units = units;
  db.realtimeData = generateRealtimeData(plants, units);
  db.aggregatedData = generateAggregatedData(plants);
  db.alerts = generateAlerts(plants, units);
  db.approvals = generateApprovals(db.alerts, users);
  db.weeklyReports = generateWeeklyReports(plants);
  db.maintenanceRecords = generateMaintenanceRecords(plants, units);
  
  console.log('Mock data initialized successfully');
  console.log(`Plants: ${db.plants.length}, Units: ${db.units.length}`);
  console.log(`Users: ${db.users.length}, Alerts: ${db.alerts.length}`);
};
