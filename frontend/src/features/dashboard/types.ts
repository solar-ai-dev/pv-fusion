import type {
  ActionCandidate,
  PriorityLevel,
  SeverityLevel,
} from "../results/types";
import type { TargetType } from "../images/types";

export type DashboardQueryParams = {
  plantId?: number;
  zoneId?: number;
  from?: string;
  to?: string;
};

export type DashboardTrendInterval = "DAILY" | "WEEKLY" | "MONTHLY";

export type DashboardTrendQueryParams = DashboardQueryParams & {
  interval?: DashboardTrendInterval;
};

export type DashboardSummary = {
  totalPlantCount: number;
  totalZoneCount: number;
  totalInspectionCount: number;
  inProgressInspectionCount: number;
  completedInspectionCount: number;
  totalImageCount: number;
  totalAnalysisJobCount: number;
  queuedJobCount: number;
  runningJobCount: number;
  succeededJobCount: number;
  failedJobCount: number;
  totalAnalysisResultCount: number;
  normalResultCount: number;
  anomalyResultCount: number;
  lowConfidenceResultCount: number;
  anomalyZoneCount: number;
  highPriorityCount: number;
  pendingReviewCount: number;
  worsenedCount: number;
  repeatedAnomalyCount: number;
};

export type PriorityTarget = {
  plantId: number | null;
  zoneId: number | null;
  equipmentId: number | null;
  targetType: TargetType | null;
  resultId: number | null;
  actionCandidate: ActionCandidate | null;
  severityLevel: SeverityLevel | null;
  priorityLevel: PriorityLevel | null;
  priorityReason: string | null;
};

export type RecentInspectionResult = {
  resultId: number | null;
  inspectionId: number | null;
  plantId: number | null;
  zoneId: number | null;
  equipmentId: number | null;
  plantName: string | null;
  zoneName: string | null;
  inspectionName: string | null;
  actionCandidate: ActionCandidate | null;
  severityLevel: SeverityLevel | null;
  priorityLevel: PriorityLevel | null;
  analyzedAt: string | null;
};

export type DashboardResponse = {
  summary: DashboardSummary;
  recentResults: RecentInspectionResult[];
  priorityTargets: PriorityTarget[];
};

export type DashboardActionStatItem = {
  actionCandidate: ActionCandidate;
  count: number;
};

export type DashboardActionStats = {
  items: DashboardActionStatItem[];
};

export type DashboardSeverityStatItem = {
  severityLevel: SeverityLevel;
  count: number;
};

export type DashboardSeverityStats = {
  items: DashboardSeverityStatItem[];
};

export type DashboardTrendPoint = {
  trendDate: string;
  inspectionCount: number;
  anomalyCount: number;
};

export type DashboardTrend = {
  period: string;
  points: DashboardTrendPoint[];
};

export const DASHBOARD_INTERVAL_OPTIONS: DashboardTrendInterval[] = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
];

export function getDashboardIntervalLabel(interval: DashboardTrendInterval) {
  switch (interval) {
    case "DAILY":
      return "일간";
    case "WEEKLY":
      return "주간";
    case "MONTHLY":
      return "월간";
  }
}

export function getPriorityReasonLabel(reason?: string | null) {
  switch (reason) {
    case "worsened and repeated anomaly":
      return "반복 이상이면서 악화된 대상입니다.";
    case "worsened tracking result":
      return "이전 점검 대비 악화된 대상입니다.";
    case "repeated anomaly":
      return "반복적으로 이상이 관찰된 대상입니다.";
    case "tracked anomaly":
      return "추적 중인 이상 대상입니다.";
    case "severity level increased":
      return "심각도 등급이 상승했습니다.";
    case "severity score increased":
      return "심각도 점수가 상승했습니다.";
    case "anomaly count increased":
      return "이상 개수가 증가했습니다.";
    case "new high severity defect detected":
      return "고심각도 결함이 새로 탐지되었습니다.";
    case "no priority escalation":
      return "우선순위 상승 사유가 없습니다.";
    default:
      return reason ?? "-";
  }
}

export function getDashboardIntervalText(interval: DashboardTrendInterval) {
  switch (interval) {
    case "DAILY":
      return "일간";
    case "WEEKLY":
      return "주간";
    case "MONTHLY":
      return "월간";
  }
}

export function getPriorityReasonText(reason?: string | null) {
  switch (reason) {
    case "worsened and repeated anomaly":
      return "반복 이상이면서 악화된 항목입니다.";
    case "worsened tracking result":
      return "이전 점검 대비 악화된 항목입니다.";
    case "repeated anomaly":
      return "반복적으로 이상이 관찰된 항목입니다.";
    case "tracked anomaly":
      return "추적 중인 이상 항목입니다.";
    case "severity level increased":
      return "심각도 등급이 상승했습니다.";
    case "severity score increased":
      return "심각도 점수가 상승했습니다.";
    case "anomaly count increased":
      return "이상 개수가 증가했습니다.";
    case "new high severity defect detected":
      return "고심각도 결함이 새로 감지되었습니다.";
    case "no priority escalation":
      return "우선순위 상승 사유가 없습니다.";
    default:
      return reason ?? "-";
  }
}
