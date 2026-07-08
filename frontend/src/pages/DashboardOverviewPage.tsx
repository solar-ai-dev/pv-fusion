import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";
import { DashboardKpiCard } from "../features/dashboard/components/DashboardKpiCard";
import { DistributionPanel } from "../features/dashboard/components/DistributionPanel";
import { TrendChart } from "../features/dashboard/components/TrendChart";
import {
  useDashboardActionStats,
  useDashboardSeverityStats,
  useDashboardSummary,
  useDashboardTrends,
} from "../features/dashboard/hooks/useDashboard";
import {
  DASHBOARD_INTERVAL_OPTIONS,
  getDashboardIntervalText,
  getPriorityReasonText,
  type DashboardQueryParams,
  type DashboardTrendInterval,
  type PriorityTarget,
  type RecentInspectionResult,
} from "../features/dashboard/types";
import { useInspections } from "../features/inspections/hooks/useInspections";
import {
  getInspectionStatusLabel,
  getInspectionStatusTone,
  type InspectionSummary,
} from "../features/inspections/types";
import { usePlants } from "../features/plants/hooks/usePlants";
import {
  getActionCandidateLabel,
  getPriorityLevelLabel,
  getSeverityLevelLabel,
  getSeverityLevelTone,
} from "../features/results/types";
import { useZonesByPlantId } from "../features/zones/hooks/useZones";
import { FormField } from "../shared/components/form/FormField";
import { PageHeader } from "../shared/components/layout/PageHeader";
import { StatusBadge } from "../shared/components/state/StatusBadge";
import { EmptyState } from "../shared/components/state/EmptyState";
import { ErrorState } from "../shared/components/state/ErrorState";
import { LoadingState } from "../shared/components/state/LoadingState";
import {
  formatTableDateTime,
  getApiErrorMessage,
  parsePositiveNumber,
} from "../shared/utils";

export function DashboardOverviewPage() {
  const role = useAuth((state) => state.user?.role);
  const [searchParams, setSearchParams] = useSearchParams();

  const plantId = parsePositiveNumber(searchParams.get("plantId") ?? undefined);
  const zoneId = parsePositiveNumber(searchParams.get("zoneId") ?? undefined);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const interval = toInterval(searchParams.get("interval"));

  const params = useMemo<DashboardQueryParams>(
    () => ({
      plantId: plantId ?? undefined,
      zoneId: zoneId ?? undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [from, plantId, to, zoneId],
  );
  const hasScopedFilter = Boolean(params.plantId || params.zoneId);
  const canQuery = role === "ADMIN" || hasScopedFilter;

  const plantsQuery = usePlants({ page: 0, size: 100, status: "ACTIVE" });
  const zonesQuery = useZonesByPlantId(plantId ?? 0);
  const summaryQuery = useDashboardSummary(params, canQuery);
  const actionStatsQuery = useDashboardActionStats(params, canQuery);
  const severityStatsQuery = useDashboardSeverityStats(params, canQuery);
  const trendsQuery = useDashboardTrends({ ...params, interval }, canQuery);
  const inspectionsQuery = useInspections(
    { ...params, page: 0, size: 5 },
    canQuery,
  );

  const summary = summaryQuery.data?.data.summary ?? null;
  const recentResults = summaryQuery.data?.data.recentResults ?? [];
  const priorityTargets = summaryQuery.data?.data.priorityTargets ?? [];
  const recentInspections = inspectionsQuery.data?.data.content ?? [];
  const trendPoints = trendsQuery.data?.data.points ?? [];
  const actionStatItems = actionStatsQuery.data?.data.items ?? [];

  const plantMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const plant of plantsQuery.data?.data.content ?? []) {
      map.set(plant.plantId, plant.name);
    }
    return map;
  }, [plantsQuery.data]);

  const selectedPlantName = plantId
    ? (plantsQuery.data?.data.content.find((plant) => plant.plantId === plantId)
        ?.name ?? `발전소 #${plantId}`)
    : "전체 발전소";
  const selectedZoneName = zoneId
    ? (zonesQuery.data?.data.find((zone) => zone.zoneId === zoneId)?.name ??
      `구역 #${zoneId}`)
    : "전체 구역";

  const actionCandidateTotal = actionStatItems.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const retakeCount =
    actionStatItems.find((item) => item.actionCandidate === "RETAKE")?.count ??
    0;

  const severityItems = (severityStatsQuery.data?.data.items ?? []).map(
    (item) => ({
      label: getSeverityLevelLabel(item.severityLevel),
      value: item.count,
      hint: item.severityLevel,
    }),
  );

  const actionItems = actionStatItems.map((item) => ({
    label: getActionCandidateLabel(item.actionCandidate),
    value: item.count,
    hint: item.actionCandidate,
  }));

  const plantAnomalySummary = useMemo(() => {
    const results = summaryQuery.data?.data.recentResults ?? [];
    const map = new Map<
      string,
      { anomaly: number; total: number; criticalOrHigh: number }
    >();
    for (const result of results) {
      const key = result.plantName ?? "미지정";
      const entry = map.get(key) ?? { anomaly: 0, total: 0, criticalOrHigh: 0 };
      entry.total += 1;
      if (result.severityLevel != null) {
        entry.anomaly += 1;
      }
      if (
        result.severityLevel === "CRITICAL" ||
        result.severityLevel === "HIGH"
      ) {
        entry.criticalOrHigh += 1;
      }
      map.set(key, entry);
    }
    return Array.from(map.entries()).map(([name, stats]) => ({
      name,
      ...stats,
    }));
  }, [summaryQuery.data]);

  const opsPriorityCards = useMemo(
    () => [
      {
        key: "failed",
        label: "실패 분석",
        count: summary?.failedJobCount ?? 0,
        hint: "재실행 또는 원인 확인",
        href: buildDashboardPath("/inspections", params, {
          inspectionStatus: "FAILED",
        }),
        tone: "danger" as const,
      },
      {
        key: "review",
        label: "검토 대기",
        count: summary?.pendingReviewCount ?? 0,
        hint: "미검토 결과 확인",
        href: buildDashboardPath("/results", params, {
          reviewStatus: "UNCHECKED",
        }),
        tone: "amber" as const,
      },
      {
        key: "anomaly",
        label: "이상 후보",
        count: summary?.anomalyResultCount ?? 0,
        hint: "이상 결과 우선 확인",
        href: buildDashboardPath("/results", params, {
          resultStatus: "ANOMALY",
        }),
        tone: "rose" as const,
      },
      {
        key: "repeated",
        label: "반복 이상",
        count: summary?.repeatedAnomalyCount ?? 0,
        hint: "변화 추적 대상",
        href: buildDashboardPath("/tracking", params),
        tone: "sky" as const,
      },
      {
        key: "retake",
        label: "재촬영 후보",
        count: retakeCount,
        hint: "재촬영 검토 필요",
        href: buildDashboardPath("/results", params, {
          actionCandidate: "RETAKE",
        }),
        tone: "cyan" as const,
      },
      {
        key: "action",
        label: "조치 후보",
        count: actionCandidateTotal,
        hint: "조치 유형별 확인",
        href: buildDashboardPath("/results", params),
        tone: "orange" as const,
      },
    ],
    [actionCandidateTotal, params, retakeCount, summary],
  );

  const reviewStatusItems = [
    {
      label: "분석 대기",
      value: summary?.queuedJobCount ?? 0,
      tone: "slate" as const,
      description: "분석 큐 대기",
    },
    {
      label: "분석 중",
      value: summary?.runningJobCount ?? 0,
      tone: "sky" as const,
      description: "처리 진행 중",
    },
    {
      label: "검토 대기",
      value: summary?.pendingReviewCount ?? 0,
      tone: "amber" as const,
      description: "즉시 확인 필요",
    },
    {
      label: "실패",
      value: summary?.failedJobCount ?? 0,
      tone: "orange" as const,
      description: "재실행 또는 원인 확인",
    },
    {
      label: "완료",
      value: summary?.succeededJobCount ?? 0,
      tone: "emerald" as const,
      description: "분석 완료",
    },
  ];
  const reviewStatusTotal = Math.max(
    reviewStatusItems.reduce((sum, item) => sum + item.value, 0),
    1,
  );

  const scopeChips = [
    selectedPlantName,
    selectedZoneName,
    `${getDashboardIntervalText(interval)} 기준`,
  ];

  const isLoading =
    canQuery &&
    (summaryQuery.isLoading ||
      actionStatsQuery.isLoading ||
      severityStatsQuery.isLoading ||
      trendsQuery.isLoading ||
      inspectionsQuery.isLoading) &&
    !summary;

  const queryError =
    summaryQuery.error ??
    actionStatsQuery.error ??
    severityStatsQuery.error ??
    trendsQuery.error ??
    inspectionsQuery.error;

  return (
    <section className="dashboard-shell">
      <section className="panel dashboard-card dashboard-hero-panel">
        <div className="dashboard-hero-main">
          <PageHeader
            title="대시보드"
            description="오늘 확인할 운영 우선순위와 점검·분석 현황을 한 화면에서 판단합니다."
          />
          <div className="dashboard-chip-row">
            {scopeChips.map((chip) => (
              <span key={chip} className="dashboard-chip">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="dashboard-hero-actions">
          <Link className="btn btn-secondary" to="/results">
            결과 보기
          </Link>
          <Link className="btn btn-secondary" to="/inspections">
            점검 보기
          </Link>
          <Link className="btn btn-secondary" to="/tracking">
            변화 추적
          </Link>
        </div>
      </section>

      <section className="panel dashboard-card dashboard-filter-panel">
        <div className="dashboard-filter-bar">
          <div className="dashboard-filter-heading">
            <span className="dashboard-filter-title">분석 범위</span>
            <p>기간, 발전소, 구역 필터를 조합해 운영 현황을 비교합니다.</p>
          </div>
          <div className="dashboard-filter-grid">
            <FormField label="기간">
              <select
                className="input-field"
                value={interval}
                onChange={(event) => {
                  const next = new URLSearchParams(searchParams);
                  next.set("interval", event.target.value);
                  setSearchParams(next);
                }}
              >
                {DASHBOARD_INTERVAL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {getDashboardIntervalText(option)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="발전소">
              <select
                className="input-field"
                value={plantId ? String(plantId) : ""}
                onChange={(event) => {
                  const next = new URLSearchParams(searchParams);
                  if (event.target.value)
                    next.set("plantId", event.target.value);
                  else next.delete("plantId");
                  next.delete("zoneId");
                  setSearchParams(next);
                }}
              >
                <option value="">전체</option>
                {plantsQuery.data?.data.content.map((plant) => (
                  <option key={plant.plantId} value={plant.plantId}>
                    {plant.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="구역">
              <select
                className="input-field"
                disabled={!plantId}
                value={zoneId ? String(zoneId) : ""}
                onChange={(event) => {
                  const next = new URLSearchParams(searchParams);
                  if (event.target.value)
                    next.set("zoneId", event.target.value);
                  else next.delete("zoneId");
                  setSearchParams(next);
                }}
              >
                <option value="">
                  {plantId ? "전체" : "발전소를 먼저 선택하세요."}
                </option>
                {zonesQuery.data?.data.map((zone) => (
                  <option key={zone.zoneId} value={zone.zoneId}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="시작일">
              <input
                className="input-field"
                type="date"
                value={from}
                onChange={(event) => {
                  const next = new URLSearchParams(searchParams);
                  if (event.target.value) next.set("from", event.target.value);
                  else next.delete("from");
                  setSearchParams(next);
                }}
              />
            </FormField>
            <FormField label="종료일">
              <input
                className="input-field"
                type="date"
                value={to}
                onChange={(event) => {
                  const next = new URLSearchParams(searchParams);
                  if (event.target.value) next.set("to", event.target.value);
                  else next.delete("to");
                  setSearchParams(next);
                }}
              />
            </FormField>
          </div>
        </div>
      </section>

      {!canQuery ? (
        <section className="panel">
          <EmptyState
            title="먼저 발전소 또는 구역을 선택하세요."
            description="범위를 정하면 운영 우선순위, 점검 추세, 최근 결과 요약이 한 화면에 표시됩니다."
            action={
              <Link className="btn btn-secondary" to="/plants">
                발전소 보기
              </Link>
            }
          />
        </section>
      ) : null}

      {isLoading ? (
        <LoadingState message="대시보드를 불러오는 중입니다." />
      ) : null}

      {canQuery && queryError ? (
        <ErrorState
          title="대시보드를 불러오지 못했습니다."
          description={getApiErrorMessage(queryError)}
        />
      ) : null}

      {canQuery && summary ? (
        <>
          <section className="panel dashboard-card dashboard-ops-panel">
            <div className="section-header">
              <div>
                <h2 className="panel-title">운영 우선순위</h2>
                <p className="panel-description">
                  오늘 먼저 확인하고 처리해야 할 항목입니다.
                </p>
              </div>
              <Link
                className="text-button"
                to={buildDashboardPath("/tracking", params)}
              >
                변화 추적 보기
              </Link>
            </div>
            <div className="dashboard-ops-priority-grid">
              {opsPriorityCards.map((card) => (
                <OpsPriorityCard
                  key={card.key}
                  count={card.count}
                  hint={card.hint}
                  href={card.href}
                  label={card.label}
                  tone={card.tone}
                />
              ))}
            </div>
            <div className="dashboard-ops-queue">
              <div className="dashboard-ops-queue-header">
                <span className="dashboard-section-label">즉시 확인 필요</span>
                <span className="dashboard-ops-queue-count">
                  {priorityTargets.length}건
                </span>
              </div>
              {priorityTargets.length > 0 ? (
                <div className="dashboard-ops-queue-list">
                  {priorityTargets.slice(0, 6).map((target, index) => (
                    <PriorityQueueItem
                      key={`${target.resultId ?? "target"}-${index}`}
                      target={target}
                      params={params}
                    />
                  ))}
                </div>
              ) : (
                <SingleEmptyMessage
                  title="즉시 확인 대상 없음"
                  description="현재 조건에서 우선 확인할 결과가 없습니다."
                />
              )}
            </div>
          </section>

          <section className="dashboard-kpi-grid">
            <DashboardKpiCard
              label="점검 건수"
              value={`${summary.totalInspectionCount}건`}
              description={`진행 중 ${summary.inProgressInspectionCount}건 · 완료 ${summary.completedInspectionCount}건`}
              delta={`${summary.totalZoneCount}개 구역`}
            />
            <DashboardKpiCard
              label="분석 결과"
              value={`${summary.totalAnalysisResultCount}건`}
              description={`정상 ${summary.normalResultCount}건 · 이상 ${summary.anomalyResultCount}건`}
              delta={`${summary.totalAnalysisJobCount}건 처리`}
              tone="sky"
            />
            <DashboardKpiCard
              label="이상 후보"
              value={`${summary.anomalyZoneCount}개 구역`}
              description={`고우선순위 ${summary.highPriorityCount}건 · 악화 ${summary.worsenedCount}건`}
              delta={`${summary.repeatedAnomalyCount}건 반복`}
              tone="rose"
            />
            <DashboardKpiCard
              label="검토 대기"
              value={`${summary.pendingReviewCount}건`}
              description={`저신뢰 ${summary.lowConfidenceResultCount}건 · 실패 ${summary.failedJobCount}건`}
              delta={`${summary.queuedJobCount}건 대기`}
              tone="amber"
            />
          </section>

          <section className="dashboard-mid-grid">
            <article className="panel dashboard-card dashboard-card-compact">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">분석/검토 상태</h2>
                  <p className="panel-description">
                    분석 대기·진행·검토·실패·완료 현황입니다.
                  </p>
                </div>
              </div>
              <div className="dashboard-status-grid">
                {reviewStatusItems.map((item) => (
                  <div key={item.label} className="dashboard-status-card">
                    <div className="dashboard-status-card-top">
                      <span>{item.label}</span>
                      <strong>{`${item.value}건`}</strong>
                    </div>
                    <div className="dashboard-status-track">
                      <div
                        className={`dashboard-status-fill dashboard-status-fill-${item.tone}`}
                        style={{
                          width: `${Math.max((item.value / reviewStatusTotal) * 100, item.value > 0 ? 12 : 0)}%`,
                        }}
                      />
                    </div>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel dashboard-card dashboard-chart-panel dashboard-chart-panel-compact">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">점검 추세</h2>
                  <p className="panel-description">
                    기간별 점검 수와 이상 발생 수를 함께 봅니다.
                  </p>
                </div>
                <div className="dashboard-legend">
                  <span>
                    <i className="dashboard-legend-swatch dashboard-legend-swatch-sky" />
                    점검
                  </span>
                  <span>
                    <i className="dashboard-legend-swatch dashboard-legend-swatch-rose" />
                    이상 후보
                  </span>
                </div>
              </div>
              {trendPoints.length > 0 ? (
                <TrendChart points={trendPoints} />
              ) : (
                <SingleEmptyMessage
                  title="선택한 조건에 표시할 추이 데이터가 없습니다."
                  description="점검과 분석 결과가 쌓이면 추세 그래프가 표시됩니다."
                />
              )}
            </article>
          </section>

          <section className="dashboard-dist-compact-grid">
            <article className="panel dashboard-card dashboard-card-compact">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">조치 후보 분포</h2>
                  <p className="panel-description">
                    청소·재촬영·현장 점검·교체 검토 후보 수입니다.
                  </p>
                </div>
              </div>
              <DistributionPanel items={actionItems} tone="sky" compact />
            </article>
            <article className="panel dashboard-card dashboard-card-compact">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">심각도 분포</h2>
                  <p className="panel-description">
                    낮음 등급은 중립 색상으로 표시합니다.
                  </p>
                </div>
              </div>
              <DistributionPanel items={severityItems} tone="danger" compact />
            </article>
          </section>

          <section className="dashboard-bottom-grid">
            <article className="panel dashboard-card dashboard-card-compact">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">발전소별 이상 현황</h2>
                  <p className="panel-description">
                    최근 결과 기준 발전소별 이상·결함 집계입니다.
                  </p>
                </div>
              </div>
              {plantAnomalySummary.length > 0 ? (
                <div className="plant-anomaly-table">
                  <div className="plant-anomaly-header">
                    <span>발전소</span>
                    <span>결과 수</span>
                    <span>이상</span>
                    <span>고위험</span>
                  </div>
                  {plantAnomalySummary.map((row) => (
                    <div key={row.name} className="plant-anomaly-row">
                      <span className="plant-anomaly-name">{row.name}</span>
                      <span className="plant-anomaly-num">{row.total}</span>
                      <span
                        className={`plant-anomaly-num ${row.anomaly > 0 ? "plant-anomaly-danger" : ""}`}
                      >
                        {row.anomaly}
                      </span>
                      <span
                        className={`plant-anomaly-num ${row.criticalOrHigh > 0 ? "plant-anomaly-critical" : ""}`}
                      >
                        {row.criticalOrHigh}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <SingleEmptyMessage
                  title="발전소별 현황 없음"
                  description="결과 데이터가 쌓이면 여기에 표시됩니다."
                />
              )}
            </article>

            <div className="dashboard-recent-grid">
              <RecentResultsPanel
                params={params}
                recentResults={recentResults}
              />
              <RecentInspectionsPanel
                params={params}
                recentInspections={recentInspections}
                plantMap={plantMap}
              />
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

function OpsPriorityCard({
  count,
  hint,
  href,
  label,
  tone,
}: {
  count: number;
  hint: string;
  href: string;
  label: string;
  tone: "danger" | "amber" | "rose" | "sky" | "cyan" | "orange";
}) {
  const card = (
    <article
      className={`dashboard-ops-card dashboard-ops-card-${tone} ${count === 0 ? "dashboard-ops-card-empty" : ""}`}
    >
      <span className="dashboard-ops-card-label">{label}</span>
      <strong className="dashboard-ops-card-value">{count}건</strong>
      <p className="dashboard-ops-card-hint">{hint}</p>
    </article>
  );

  if (count > 0) {
    return (
      <Link className="dashboard-ops-card-link" to={href}>
        {card}
      </Link>
    );
  }

  return card;
}

function PriorityQueueItem({
  params,
  target,
}: {
  params: DashboardQueryParams;
  target: PriorityTarget;
}) {
  const href = getPriorityTargetLink(target, params);
  const content = (
    <article className="dashboard-ops-queue-item">
      <div className="dashboard-ops-queue-item-main">
        <div className="dashboard-ops-queue-item-top">
          <strong>{`결과 #${target.resultId ?? "-"}`}</strong>
          <StatusBadge
            label={getPriorityLevelLabel(target.priorityLevel)}
            tone="amber"
          />
        </div>
        <p>{getPriorityReasonText(target.priorityReason)}</p>
        <div className="dashboard-ops-queue-item-meta">
          <StatusBadge
            label={getSeverityLevelLabel(target.severityLevel)}
            tone={getSeverityLevelTone(target.severityLevel)}
          />
          <span>{getActionCandidateLabel(target.actionCandidate)}</span>
        </div>
      </div>
      {href ? (
        <span className="text-button dashboard-summary-link">확인</span>
      ) : null}
    </article>
  );

  if (href) {
    return (
      <Link className="dashboard-ops-queue-item-link" to={href}>
        {content}
      </Link>
    );
  }

  return content;
}

function RecentResultsPanel({
  params,
  recentResults,
}: {
  params: DashboardQueryParams;
  recentResults: RecentInspectionResult[];
}) {
  return (
    <article className="panel dashboard-card dashboard-summary-panel">
      <div className="section-header">
        <div>
          <h2 className="panel-title">최근 결과</h2>
          <p className="panel-description">
            심각도·조치 후보 기준으로 확인이 필요한 최근 분석 결과입니다.
          </p>
        </div>
        <Link className="text-button" to={buildDashboardPath("/results", params)}>
          전체 보기
        </Link>
      </div>
      {recentResults.length > 0 ? (
        <div className="dashboard-recent-table">
          <div className="dashboard-recent-table-header dashboard-recent-table-row-results">
            <span>결과</span>
            <span>상태</span>
            <span>심각도</span>
            <span>조치 후보</span>
            <span>분석 시각</span>
            <span>액션</span>
          </div>
          {recentResults.slice(0, 5).map((result) => (
            <div
              key={result.resultId ?? result.inspectionId ?? "recent-result"}
              className="dashboard-recent-table-row dashboard-recent-table-row-results"
            >
              <span className="dashboard-recent-primary">
                {result.resultId ? `#${result.resultId}` : "-"}
              </span>
              <span>
                <StatusBadge
                  label={
                    result.severityLevel != null ? "이상" : "정상"
                  }
                  tone={result.severityLevel != null ? "orange" : "emerald"}
                />
              </span>
              <span>{getSeverityLevelLabel(result.severityLevel)}</span>
              <span>{getActionCandidateLabel(result.actionCandidate)}</span>
              <span>{formatTableDateTime(result.analyzedAt)}</span>
              <span>
                {result.resultId ? (
                  <Link
                    className="text-button"
                    to={`/results/${result.resultId}`}
                  >
                    결과 보기
                  </Link>
                ) : (
                  "-"
                )}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <SingleEmptyMessage
          title="최근 결과 없음"
          description="분석이 완료되면 최근 결과가 표시됩니다."
        />
      )}
    </article>
  );
}

function RecentInspectionsPanel({
  params,
  plantMap,
  recentInspections,
}: {
  params: DashboardQueryParams;
  plantMap: Map<number, string>;
  recentInspections: InspectionSummary[];
}) {
  return (
    <article className="panel dashboard-card dashboard-summary-panel">
      <div className="section-header">
        <div>
          <h2 className="panel-title">최근 점검</h2>
          <p className="panel-description">
            진행 중이거나 후속 확인이 필요한 최근 점검입니다.
          </p>
        </div>
        <Link
          className="text-button"
          to={buildDashboardPath("/inspections", params)}
        >
          전체 보기
        </Link>
      </div>
      {recentInspections.length > 0 ? (
        <div className="dashboard-recent-table">
          <div className="dashboard-recent-table-header dashboard-recent-table-row-inspections">
            <span>점검명</span>
            <span>발전소 / 구역</span>
            <span>상태</span>
            <span>촬영 시각</span>
            <span>액션</span>
          </div>
          {recentInspections.map((inspection) => (
            <div
              key={inspection.inspectionId}
              className="dashboard-recent-table-row dashboard-recent-table-row-inspections"
            >
              <span className="dashboard-recent-primary">{inspection.name}</span>
              <span>
                {inspection.plantId
                  ? (plantMap.get(inspection.plantId) ??
                    `발전소 #${inspection.plantId}`)
                  : "-"}
                {" · "}
                {`구역 #${inspection.zoneId}`}
              </span>
              <span>
                <StatusBadge
                  label={getInspectionStatusLabel(inspection.inspectionStatus)}
                  tone={getInspectionStatusTone(inspection.inspectionStatus)}
                />
              </span>
              <span>{formatTableDateTime(inspection.capturedAt)}</span>
              <span>
                <Link
                  className="text-button"
                  to={`/inspections/${inspection.inspectionId}`}
                >
                  점검 보기
                </Link>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <SingleEmptyMessage
          title="최근 점검 없음"
          description="점검이 등록되면 최근 점검 목록이 표시됩니다."
        />
      )}
    </article>
  );
}

function SingleEmptyMessage({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="compact-empty">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function buildDashboardPath(
  base: string,
  params: DashboardQueryParams,
  extra?: Record<string, string>,
) {
  const query = new URLSearchParams();
  if (params.plantId) query.set("plantId", String(params.plantId));
  if (params.zoneId) query.set("zoneId", String(params.zoneId));
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) query.set(key, value);
    }
  }
  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}

function getPriorityTargetLink(
  target: PriorityTarget,
  params: DashboardQueryParams,
) {
  const reason = target.priorityReason ?? "";
  if (
    reason.includes("tracking") ||
    reason.includes("worsened") ||
    reason.includes("repeated")
  ) {
    return buildDashboardPath("/tracking", params);
  }
  if (target.resultId) {
    return `/results/${target.resultId}`;
  }
  return null;
}

function toInterval(value: string | null): DashboardTrendInterval {
  if (value === "WEEKLY" || value === "MONTHLY") {
    return value;
  }

  return "DAILY";
}
