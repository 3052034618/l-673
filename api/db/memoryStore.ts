import type {
  User,
  Plant,
  Unit,
  RealtimeData,
  AggregatedData,
  Alert,
  Approval,
  ApprovalStep,
  WeeklyReport,
  MaintenanceRecord,
} from '../../shared/types.js';

interface ForecastHistoryEntry {
  id: string;
  plantId: string;
  uploadDate: string;
  data: any[];
}

interface Database {
  users: User[];
  plants: Plant[];
  units: Unit[];
  realtimeData: RealtimeData[];
  aggregatedData: AggregatedData[];
  alerts: Alert[];
  approvals: Approval[];
  approvalSteps: ApprovalStep[];
  weeklyReports: WeeklyReport[];
  maintenanceRecords: MaintenanceRecord[];
  forecastHistory: ForecastHistoryEntry[];
}

export const db: Database = {
  users: [],
  plants: [],
  units: [],
  realtimeData: [],
  aggregatedData: [],
  alerts: [],
  approvals: [],
  approvalSteps: [],
  weeklyReports: [],
  maintenanceRecords: [],
  forecastHistory: [],
};

export const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
