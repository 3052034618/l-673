export type UserRole = 'group_admin' | 'region_admin' | 'shift_supervisor' | 'plant_manager' | 'epb';

export type PlantStatus = 'running' | 'stopped' | 'maintenance';

export type UnitStatus = 'running' | 'stopped' | 'standby';

export type AlertType = 'emission' | 'availability' | 'temperature' | 'pressure';

export type AlertLevel = 'level1' | 'level2';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'escalated';

export type ApprovalType = 'parameter_adjust' | 'shutdown';

export type ApprovalStatus = 'pending_shift' | 'pending_manager' | 'pending_epb' | 'approved' | 'rejected';

export type ApprovalRole = 'shift_supervisor' | 'plant_manager' | 'epb';

export type StepStatus = 'pending' | 'approved' | 'rejected';

export type PeriodType = 'hour' | 'day' | 'month';

export interface Plant {
  id: string;
  name: string;
  province: string;
  city: string;
  address: string;
  capacity: number;
  units: Unit[];
  status: PlantStatus;
  lng?: number;
  lat?: number;
  createdAt: string;
}

export interface Unit {
  id: string;
  plantId: string;
  name: string;
  capacity: number;
  status: UnitStatus;
  createdAt: string;
}

export interface RealtimeData {
  id: string;
  plantId: string;
  unitId: string;
  timestamp: string;
  furnaceTemp: number;
  steamPressure: number;
  powerGeneration: number;
  so2: number;
  nox: number;
  particulate: number;
  garbageInput: number;
}

export interface AggregatedData {
  id: string;
  plantId: string;
  date: string;
  period: PeriodType;
  totalGarbage: number;
  totalPower: number;
  powerPerTon: number;
  complianceRate: number;
  availabilityRate: number;
  ignitionLossRate: number;
}

export interface Alert {
  id: string;
  plantId: string;
  unitId: string;
  type: AlertType;
  level: AlertLevel;
  status: AlertStatus;
  message: string;
  startTime: string;
  endTime?: string;
  duration: number;
  threshold: number;
  actualValue: number;
  handlerId?: string;
  handlerNote?: string;
}

export interface ApprovalStep {
  id: string;
  step: number;
  role: ApprovalRole;
  status: StepStatus;
  approverId?: string;
  approverName?: string;
  comment?: string;
  approvedAt?: string;
}

export interface Approval {
  id: string;
  alertId?: string;
  plantId: string;
  type: ApprovalType;
  status: ApprovalStatus;
  currentStep: number;
  steps: ApprovalStep[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  region?: string;
  plantId?: string;
  permissions: string[];
}

export interface ForecastResult {
  date: string;
  supply: number;
  capacity: number;
  gap: number;
  recommendations: string[];
}

export interface WeeklyReport {
  id: string;
  plantId?: string;
  region?: string;
  weekStart: string;
  weekEnd: string;
  totalPower: number;
  powerYoY: number;
  powerMoM: number;
  complianceRate: number;
  failureRate: number;
  powerPerTonRanking: { plantId: string; plantName: string; value: number }[];
  optimizationSuggestions: string[];
  createdAt: string;
}

export interface MaintenanceRecord {
  id: string;
  plantId: string;
  unitId: string;
  type: string;
  description: string;
  startTime: string;
  endTime?: string;
  status: string;
  notes?: string;
}

export interface ProvinceStats {
  province: string;
  totalGarbage: number;
  totalPower: number;
  plantCount: number;
  complianceRate: number;
}

export interface PlantRankingItem {
  plantId: string;
  plantName: string;
  province: string;
  value: number;
  rank: number;
}
