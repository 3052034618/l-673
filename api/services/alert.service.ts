import { db, generateId } from '../db/memoryStore.js';
import {
  checkEmissionAlert,
  checkTemperatureAlert,
  checkPressureAlert,
  checkAvailabilityAlert
} from './calculationEngine.service.js';
import type { Alert, AlertType, AlertLevel, AlertStatus, RealtimeData } from '../../shared/types.js';

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

export const checkAndCreateAvailabilityAlert = (plantId: string, availabilityRate: number): Alert | null => {
  if (!checkAvailabilityAlert(availabilityRate)) {
    return null;
  }
  
  const existingAlert = db.alerts.find(a => 
    a.plantId === plantId && 
    a.type === 'availability' &&
    a.status !== 'resolved'
  );
  
  const now = new Date();
  const plant = db.plants.find(p => p.id === plantId);
  
  const duration = existingAlert ? 
    Math.floor((now.getTime() - new Date(existingAlert.startTime).getTime()) / 60000) : 120;
  
  const shouldEscalate = duration >= 120;
  
  if (!existingAlert || (shouldEscalate && existingAlert.level === 'level1')) {
    return createAlert({
      plantId,
      unitId: '',
      type: 'availability',
      level: shouldEscalate ? 'level2' : 'level1',
      status: shouldEscalate ? 'escalated' : 'active',
      message: `${plant?.name || '工厂'}设备可用率低于85%`,
      startTime: existingAlert?.startTime || now.toISOString(),
      duration,
      threshold: AVAILABILITY_THRESHOLD,
      actualValue: Number(availabilityRate.toFixed(2))
    });
  }
  
  return existingAlert;
};

export const getActiveAlertsCount = (plantId?: string): number => {
  return db.alerts.filter(a => 
    a.status !== 'resolved' && 
    (!plantId || a.plantId === plantId)
  ).length;
};
