import * as auth from './auth';
import * as plant from './plant';
import * as alert from './alert';
import * as approval from './approval';
import * as forecast from './forecast';
import * as realtime from './realtime';

export const authApi = auth;
export const plantApi = plant;
export const alertApi = alert;
export const approvalApi = approval;
export const forecastApi = forecast;
export const realtimeApi = realtime;

export * from './auth';
export * from './plant';
export * from './alert';
export * from './approval';
export * from './forecast';
export * from './realtime';
