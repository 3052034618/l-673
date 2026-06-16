import request from './request';
import type { Alert, AlertLevel, AlertStatus } from '../../shared/types';

export const getAlerts = (params?: {
  plantId?: string;
  level?: AlertLevel;
  status?: AlertStatus;
  limit?: number;
}): Promise<Alert[]> => {
  return request.get('/alerts', { params });
};

export const getAlertById = (id: string): Promise<Alert> => {
  return request.get(`/alerts/${id}`);
};

export const acknowledgeAlert = (id: string, handlerNote?: string): Promise<Alert> => {
  return request.post(`/alerts/${id}/acknowledge`, { handlerNote });
};

export const resolveAlert = (id: string, resolutionNote: string): Promise<Alert> => {
  return request.post(`/alerts/${id}/resolve`, { resolutionNote });
};

export const escalateAlert = (id: string): Promise<Alert> => {
  return request.post(`/alerts/${id}/escalate`);
};

export const getActiveAlertsCount = (plantId?: string): Promise<{ count: number }> => {
  return request.get('/alerts/active/count', { params: { plantId } });
};
