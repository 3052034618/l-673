import axios from 'axios';

const baseURL = 'http://localhost:3001/api';
const api = axios.create({ baseURL, timeout: 10000 });

let token = '';
let testPlantId = '';

async function testLogin() {
  console.log('\n=== 1. 测试登录API ===');
  try {
    const res = await api.post('/auth/login', { username: 'admin', password: '123456' });
    token = res.data.token;
    api.defaults.headers.Authorization = `Bearer ${token}`;
    console.log('✅ 登录成功，token获取成功');
    console.log('   用户:', res.data.user.username, '角色:', res.data.user.role);
    return res.data;
  } catch (e) {
    console.log('❌ 登录失败:', e.response?.data || e.message);
    throw e;
  }
}

async function testGetPlants() {
  console.log('\n=== 2. 测试工厂列表API ===');
  try {
    const res = await api.get('/plants');
    console.log(`✅ 获取到 ${res.data.length} 个工厂`);
    testPlantId = res.data[0].id;
    console.log('   第一个工厂:', res.data[0].name, '省份:', res.data[0].province, '区域:', res.data[0].region);
    return res.data;
  } catch (e) {
    console.log('❌ 获取工厂失败:', e.response?.data || e.message);
    throw e;
  }
}

async function testProvinceStats() {
  console.log('\n=== 3. 测试省份统计API（热力图） ===');
  try {
    const res = await api.get('/plants/province-stats');
    console.log(`✅ 获取到 ${res.data.length} 个省份的统计数据`);
    console.log('   前3个省份:', res.data.slice(0, 3).map(p => `${p.province}: ${p.totalGarbage}吨`).join(', '));
    return res.data;
  } catch (e) {
    console.log('❌ 获取省份统计失败:', e.response?.data || e.message);
    throw e;
  }
}

async function testPlantRanking() {
  console.log('\n=== 4. 测试发电效率排名API ===');
  try {
    const res = await api.get('/plants/ranking?metric=powerPerTon');
    console.log(`✅ 获取到 ${res.data.length} 个工厂的排名`);
    console.log('   前3名:');
    res.data.slice(0, 3).forEach((item, i) => {
      console.log(`     ${i + 1}. ${item.plantName} (${item.region}) - ${item.value} kWh/吨`);
    });
    return res.data;
  } catch (e) {
    console.log('❌ 获取排名失败:', e.response?.data || e.message);
    throw e;
  }
}

async function testGapForecastByRegion() {
  console.log('\n=== 5. 测试30天缺口预测API（按区域） ===');
  try {
    const res = await api.get('/forecast/gap?days=30&region=华东');
    console.log(`✅ 获取到 ${res.data.forecast.length} 天的预测数据`);
    console.log('   汇总信息:');
    console.log('     总供应量:', res.data.summary.totalSupply, '吨');
    console.log('     总处理能力:', res.data.summary.totalCapacity, '吨');
    console.log('     总缺口:', res.data.summary.totalGap, '吨');
    console.log('     平均日供应量:', res.data.summary.averageDailySupply, '吨');
    console.log('     平均日处理能力:', res.data.summary.averageDailyCapacity, '吨');
    console.log('     缺口天数:', res.data.summary.gapDays, '天');
    console.log('     建议:', res.data.summary.recommendations.slice(0, 2).join('; '));
    
    const hasNaN = res.data.forecast.some(d => 
      isNaN(d.supply) || isNaN(d.capacity) || isNaN(d.gap) ||
      d.supply === null || d.capacity === null || d.gap === null
    );
    console.log('   数据完整性检查:', hasNaN ? '❌ 存在NaN/空值' : '✅ 无NaN/空值');
    
    return res.data;
  } catch (e) {
    console.log('❌ 获取缺口预测失败:', e.response?.data || e.message);
    throw e;
  }
}

async function testOptimalTransport() {
  console.log('\n=== 6. 测试最优调运方案API ===');
  try {
    const res = await api.get('/forecast/transport?region=华东');
    console.log('✅ 调运方案获取成功');
    console.log('   是否有缺口:', res.data.hasGap ? '是' : '否');
    console.log('   可调入工厂数:', res.data.sourcePlants.length);
    console.log('   调运路线数:', res.data.transportRoutes.length);
    if (res.data.transportRoutes.length > 0) {
      console.log('   前3条调运路线:');
      res.data.transportRoutes.slice(0, 3).forEach((route, i) => {
        console.log(`     ${i + 1}. ${route.fromPlantName} → ${route.toPlantName}: ${route.amount}吨, 成本${route.estimatedCost}元, 优先级${route.priority}`);
      });
    }
    return res.data;
  } catch (e) {
    console.log('❌ 获取调运方案失败:', e.response?.data || e.message);
    console.log('   错误状态码:', e.response?.status);
    if (e.response?.status !== 500) {
      console.log('   ✅ 没有报500错误');
    }
    throw e;
  }
}

async function testStandbyBoiler() {
  console.log('\n=== 7. 测试备用炉建议API ===');
  try {
    const res = await api.get('/forecast/standby?region=华东');
    console.log('✅ 备用炉建议获取成功');
    console.log('   是否建议启动:', res.data.shouldStart ? '是' : '否');
    if (res.data.shouldStart) {
      console.log('   建议启动日期:', res.data.recommendedStartDate);
      console.log('   预计持续时间:', res.data.estimatedDuration, '天');
      console.log('   预计日处理增量:', res.data.expectedDailyProcessing, '吨');
      console.log('   总预计增量:', res.data.totalExpectedIncrement, '吨');
      console.log('   成本效益分析:', res.data.costBenefitAnalysis);
    } else {
      console.log('   不启动原因:', res.data.noStartReason || '未提供');
    }
    return res.data;
  } catch (e) {
    console.log('❌ 获取备用炉建议失败:', e.response?.data || e.message);
    console.log('   错误状态码:', e.response?.status);
    throw e;
  }
}

async function testAvailabilityAlerts() {
  console.log('\n=== 8. 测试设备可用率预警API ===');
  try {
    const res = await api.get('/alerts');
    const availabilityAlerts = res.data.filter(a => a.type === 'availability');
    console.log(`✅ 获取到 ${res.data.length} 条预警，其中设备可用率预警 ${availabilityAlerts.length} 条`);
    
    const level1Alerts = res.data.filter(a => a.level === 'level1' && a.type === 'availability');
    const level2Alerts = res.data.filter(a => a.level === 'level2' && a.type === 'availability');
    
    console.log('   一级可用率预警:', level1Alerts.length, '条');
    console.log('   二级可用率预警:', level2Alerts.length, '条');
    
    if (availabilityAlerts.length > 0) {
      const alert = availabilityAlerts[0];
      console.log('   最新可用率预警:');
      console.log('     级别:', alert.level);
      console.log('     状态:', alert.status);
      console.log('     消息:', alert.message);
      console.log('     实际值:', alert.actualValue, '%');
    }
    
    return res.data;
  } catch (e) {
    console.log('❌ 获取预警失败:', e.response?.data || e.message);
    throw e;
  }
}

async function testApprovals() {
  console.log('\n=== 9. 测试三级审批流程API ===');
  try {
    const res = await api.get('/approvals');
    console.log(`✅ 获取到 ${res.data.length} 条审批流程`);
    
    const pendingApprovals = res.data.filter(a => a.status === 'pending');
    console.log('   待审批:', pendingApprovals.length, '条');
    
    if (res.data.length > 0) {
      const approval = res.data[0];
      console.log('   最新审批流程:');
      console.log('     类型:', approval.type);
      console.log('     当前步骤:', approval.currentStep);
      console.log('     状态:', approval.status);
      console.log('     审批步骤:');
      approval.steps.forEach((step, i) => {
        console.log(`       步骤${step.step} (${step.role}): ${step.status}${step.approverName ? ` - ${step.approverName}` : ''}`);
      });
    }
    
    return res.data;
  } catch (e) {
    console.log('❌ 获取审批失败:', e.response?.data || e.message);
    throw e;
  }
}

async function runAllTests() {
  console.log('============================================');
  console.log('  垃圾焚烧发电厂监测分析平台 - API测试套件');
  console.log('============================================');
  
  try {
    await testLogin();
    await testGetPlants();
    await testProvinceStats();
    await testPlantRanking();
    await testGapForecastByRegion();
    await testOptimalTransport();
    await testStandbyBoiler();
    await testAvailabilityAlerts();
    await testApprovals();
    
    console.log('\n============================================');
    console.log('✅ 所有API测试通过！');
    console.log('============================================\n');
  } catch (e) {
    console.log('\n============================================');
    console.log('❌ 测试中断，存在错误');
    console.log('============================================\n');
    process.exit(1);
  }
}

runAllTests();
