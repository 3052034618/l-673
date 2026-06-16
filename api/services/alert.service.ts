import { db, generateId } from '../db/memoryStore.js';
import {
  checkEmissionAlert,
  checkTemperatureAlert,
  checkPressureAlert,
  checkAvailabilityAlert
} from './calculationEngine.service.js';
import { createApproval } from './approval.service.js';
import type { Alert, AlertType, AlertLevel, AlertStatus, RealtimeData, Approval } from '../../shared/types.js';

const EMISSION_THRESHOLDS = {
  so2: 100,
  nox: 300,
  particulate: 20
};

const TEMPERATURE_THRESHOLD = 1100;
const PRESSURE_THRESHOLD = 5.5;
const AVAILABILITY_THRESHOLD = 85;

export const getAllAlerts = (
  plantId?: string,
  level?: AlertLevel,
  status?: AlertStatus
): Alert[] => {
  let alerts = [...db.alerts];
  
  if (plantId) {
    alerts = alerts.filter(a => a.plantId === plantId);
  }
  
  if (level) {
    alerts = alerts.filter(a => a.level === level);
  }
  
  if (status) {
    alerts = alerts.filter(a => a.status === status);
  }
  
  return alerts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
};

export const getAlertById = (id: string): Alert | undefined => {
  return db.alerts.find(a => a.id === id);
};

export const createAlert = (alertData: Omit<Alert, 'id'>): Alert => {
  const newAlert: Alert = {
    ...alertData,
    id: generateId()
  };
  
  db.alerts.unshift(newAlert);
  
  if (db.alerts.length > 1000) {
    db.alerts = db.alerts.slice(0, 500);
  }
  
  return newAlert;
};

export const acknowledgeAlert = (id: string, handlerId: string, handlerNote?: string): Alert => {
  const alert = db.alerts.find(a => a.id === id);
  if (!alert) {
    throw new Error('预警不存在');
  }
  
  alert.status = 'acknowledged';
  alert.handlerId = handlerId;
  alert.handlerNote = handlerNote;
  
  return alert;
};

export const resolveAlert = (id: string, handlerNote?: string): Alert => {
  const alert = db.alerts.find(a => a.id === id);
  if (!alert) {
    throw new Error('预警不存在');
  }
  
  alert.status = 'resolved';
  alert.endTime = new Date().toISOString();
  alert.duration = Math.floor((new Date().getTime() - new Date(alert.startTime).getTime()) / 60000);
  alert.handlerNote = handlerNote;
  
  return alert;
};

export const escalateAlert = (id: string): Alert => {
  const alert = db.alerts.find(a => a.id === id);
  if (!alert) {
    throw new Error('预警不存在');
  }
  
  alert.level = 'level2';
  alert.status = 'escalated';
  
  return alert;
};

export const detectAlerts = (realtimeData: RealtimeData[]): Alert[] => {
  const newAlerts: Alert[] = [];
  const now = new Date();
  
  const unitData = new Map<string, RealtimeData[]>();
  realtimeData.forEach(d => {
    const key = d.unitId;
    if (!unitData.has(key)) {
      unitData.set(key, []);
    }
    unitData.get(key)!.push(d);
  });
  
  unitData.forEach((data, unitId) => {
    if (data.length < 2) return;
    
    const sortedData = data.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const recentData = sortedData.slice(-2);
    const plantId = recentData[0].plantId;
    const unit = db.units.find(u => u.id === unitId);
    const unitName = unit?.name || '未知机组';
    
    const existingAlert = db.alerts.find(a => 
      a.unitId === unitId && 
      a.status !== 'resolved'
    );
    
    if (checkEmissionAlert(recentData)) {
      const exceedingParams = [];
      let maxExceed = 0;
      let threshold = 0;
      
      if (recentData.every(d => d.so2 > EMISSION_THRESHOLDS.so2)) {
        exceedingParams.push('SO₂');
        const avg = recentData.reduce((s, d) => s + d.so2, 0) / recentData.length;
        maxExceed = Math.max(maxExceed, avg);
        threshold = EMISSION_THRESHOLDS.so2;
      }
      if (recentData.every(d => d.nox > EMISSION_THRESHOLDS.nox)) {
        exceedingParams.push('NOₓ');
        const avg = recentData.reduce((s, d) => s + d.nox, 0) / recentData.length;
        maxExceed = Math.max(maxExceed, avg);
        threshold = EMISSION_THRESHOLDS.nox;
      }
      if (recentData.every(d => d.particulate > EMISSION_THRESHOLDS.particulate)) {
        exceedingParams.push('颗粒物');
        const avg = recentData.reduce((s, d) => s + d.particulate, 0) / recentData.length;
        maxExceed = Math.max(maxExceed, avg);
        threshold = EMISSION_THRESHOLDS.particulate;
      }
      
      if (exceedingParams.length > 0) {
        const duration = existingAlert ? 
          Math.floor((now.getTime() - new Date(existingAlert.startTime).getTime()) / 60000) : 10;
        
        const shouldEscalate = duration >= 60;
        
        if (!existingAlert || (shouldEscalate && existingAlert.level === 'level1')) {
          const alert = createAlert({
            plantId,
            unitId,
            type: 'emission',
            level: shouldEscalate ? 'level2' : 'level1',
            status: shouldEscalate ? 'escalated' : 'active',
            message: `${unitName}${exceedingParams.join('、')}排放浓度连续超标`,
            description: `${unitName}${exceedingParams.join('、')}排放浓度连续超标`,
            timestamp: now.toISOString(),
            startTime: existingAlert?.startTime || now.toISOString(),
            duration,
            threshold,
            actualValue: Number(maxExceed.toFixed(2))
          });
          newAlerts.push(alert);
        }
      }
    }
    
    const lastData = recentData[recentData.length - 1];
    
    if (checkTemperatureAlert(lastData.furnaceTemp) && 
        (!existingAlert || existingAlert.type !== 'temperature')) {
      const alert = createAlert({
        plantId,
        unitId,
        type: 'temperature',
        level: 'level1',
        status: 'active',
        message: `${unitName}炉温异常`,
        description: `${unitName}炉温异常`,
        timestamp: now.toISOString(),
        startTime: now.toISOString(),
        duration: 0,
        threshold: TEMPERATURE_THRESHOLD,
        actualValue: Number(lastData.furnaceTemp.toFixed(2))
      });
      newAlerts.push(alert);
    }
    
    if (checkPressureAlert(lastData.steamPressure) &&
        (!existingAlert || existingAlert.type !== 'pressure')) {
      const alert = createAlert({
        plantId,
        unitId,
        type: 'pressure',
        level: 'level1',
        status: 'active',
        message: `${unitName}蒸汽压力异常`,
        description: `${unitName}蒸汽压力异常`,
        timestamp: now.toISOString(),
        startTime: now.toISOString(),
        duration: 0,
        threshold: PRESSURE_THRESHOLD,
        actualValue: Number(lastData.steamPressure.toFixed(2))
      });
      newAlerts.push(alert);
    }
  });
  
  return newAlerts;
};

export const checkAndCreateAvailabilityAlert = (plantId: string): { alert: Alert | null; approval: Approval | null } => {
  const now = new Date();
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  
  const plant = db.plants.find(p => p.id === plantId);
  if (!plant) return { alert: null, approval: null };
  
  const last3HoursData = db.realtimeData.filter(d => 
    d.plantId === plantId && 
    new Date(d.timestamp) >= threeHoursAgo
  );
  
  if (last3HoursData.length < 24) {
    return { alert: null, approval: null };
  }
  
  const hourlyAvailability: { hour: string; rate: number }[] = [];
  const hourData = new Map<string, { running: number; total: number }>();
  
  last3HoursData.forEach(d => {
    const hourKey = d.timestamp.substring(0, 13);
    const existing = hourData.get(hourKey) || { running: 0, total: 0 };
    existing.total++;
    if (d.furnaceTemp > 500) {
      existing.running++;
    }
    hourData.set(hourKey, existing);
  });
  
  let consecutiveLowHours = 0;
  let firstLowHour: string | null = null;
  let currentAvailability = AVAILABILITY_THRESHOLD + 1;
  
  const sortedHours = Array.from(hourData.keys()).sort();
  sortedHours.forEach(hourKey => {
    const data = hourData.get(hourKey)!;
    const rate = data.total > 0 ? (data.running / data.total) * 100 : 100;
    hourlyAvailability.push({ hour: hourKey, rate });
    
    if (rate < AVAILABILITY_THRESHOLD) {
      if (firstLowHour === null) {
        firstLowHour = hourKey;
      }
      consecutiveLowHours++;
    } else {
      consecutiveLowHours = 0;
      firstLowHour = null;
    }
    currentAvailability = rate;
  });
  
  if (hourlyAvailability.length > 0) {
    currentAvailability = hourlyAvailability[hourlyAvailability.length - 1].rate;
  }
  
  const existingAlert = db.alerts.find(a => 
    a.plantId === plantId && 
    a.type === 'availability' &&
    a.status !== 'resolved'
  );
  
  if (currentAvailability >= AVAILABILITY_THRESHOLD) {
    if (existingAlert && existingAlert.status !== 'resolved') {
      existingAlert.status = 'resolved';
      existingAlert.endTime = now.toISOString();
      existingAlert.duration = Math.floor((now.getTime() - new Date(existingAlert.startTime).getTime()) / 60000);
      return { alert: existingAlert, approval: null };
    }
    return { alert: null, approval: null };
  }
  
  if (consecutiveLowHours < 2) {
    return { alert: existingAlert || null, approval: null };
  }
  
  let alert = existingAlert;
  let newApproval: Approval | null = null;
  
  if (!alert) {
    alert = createAlert({
      plantId,
      unitId: '',
      type: 'availability',
      level: 'level1',
      status: 'active',
      message: `${plant.name}设备可用率连续2小时低于85%，请值长立即检查设备状态`,
      description: `${plant.name}设备可用率连续2小时低于85%，请值长立即检查设备状态`,
      timestamp: now.toISOString(),
      startTime: firstLowHour ? new Date(firstLowHour + ':00:00').toISOString() : now.toISOString(),
      duration: 120,
      threshold: AVAILABILITY_THRESHOLD,
      actualValue: Number(currentAvailability.toFixed(2))
    });
    return { alert, approval: null };
  }
  
  if (alert.level === 'level1') {
    const alertDuration = Math.floor((now.getTime() - new Date(alert.startTime).getTime()) / 60000);
    
    if (alertDuration >= 180) {
      alert.level = 'level2';
      alert.status = 'escalated';
      alert.duration = alertDuration;
      alert.actualValue = Number(currentAvailability.toFixed(2));
      alert.message = `${plant.name}设备可用率持续低于85%已达3小时，已升级为二级预警，需启动三级审批流程`;
      
      newApproval = createApproval(
        alert.id,
        plantId,
        'parameter_adjust',
        '系统自动'
      );
      
      return { alert, approval: newApproval };
    }
  }
  
  if (alert) {
    alert.duration = Math.floor((now.getTime() - new Date(alert.startTime).getTime()) / 60000);
    alert.actualValue = Number(currentAvailability.toFixed(2));
  }
  
  return { alert, approval: null };
};

export const getActiveAlertsCount = (plantId?: string): number => {
  return db.alerts.filter(a => 
    a.status !== 'resolved' && 
    (!plantId || a.plantId === plantId)
  ).length;
};
