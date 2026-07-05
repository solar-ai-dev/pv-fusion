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
} from "../features/dashboard/types";
import { usePlants } from "../features/plants/hooks/usePlants";
import {
  getActionCandidateLabel,
  getPriorityLevelLabel,
  getSeverityLevelLabel,
} from "../features/results/types";
import { useZonesByPlantId } from "../features/zones/hooks/useZones";
import { FormField } from "../shared/components/form/FormField";
import { PageHeader } from "../shared/components/layout/PageHeader";
import { EmptyState } from "../shared/components/state/EmptyState";
import { ErrorState } from "../shared/components/state/ErrorState";
import { LoadingState } from "../shared/components/state/LoadingState";
import {
  formatDateTime,
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

  const summary = summaryQuery.data?.data.summary ?? null;
  const recentResults = summaryQuery.data?.data.recentResults ?? [];
  const priorityTargets = summaryQuery.data?.data.priorityTargets ?? [];
  const trendPoints = trendsQuery.data?.data.points ?? [];
  const selectedPlantName = plantId
    ? (plantsQuery.data?.data.content.find((plant) => plant.plantId === plantId)
        ?.name ?? `발전소 #${plantId}`)
    : "전체 발전소";
  const selectedZoneName = zoneId
    ? (zonesQuery.data?.data.find((zone) => zone.zoneId === zoneId)?.name ??
      `구역 #${zoneId}`)
    : "전체 구역";
  const severityItems = (severityStatsQuery.data?.data.items ?? []).map(
    (item) => ({
      label: getSeverityLevelLabel(item.severityLevel),
      value: item.count,
      hint: `${item.severityLevel} 등급`,
    }),
  );
  const actionItems = (actionStatsQuery.data?.data.items ?? []).map((item) => ({
    label: getActionCandidateLabel(item.actionCandidate),
    value: item.count,
    hint: item.actionCandidate,
  }));
  const reviewStatusItems = [
    {
      label: "검토 대기",
      value: summary?.pendingReviewCount ?? 0,
      tone: "rose" as const,
      description: "즉시 확인 필요",
    },
    {
      label: "분석 중",
      value: summary?.runningJobCount ?? 0,
      tone: "sky" as const,
      description: "처리 진행 중",
    },
    {
      label: "실패",
      value: summary?.failedJobCount ?? 0,
      tone: "rose" as const,
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

  return (
    <section className="dashboard-shell">
      <section className="panel dashboard-card dashboard-hero-panel">
        <div className="dashboard-hero-main">
          <PageHeader
            title="대시보드"
            description="기간과 범위를 기준으로 점검, 분석, 이상 징후를 한 화면에서 확인합니다."
          />
          <div className="dashboard-chip-row">
            {scopeChips.map((chip) => (
              <span key={chip} className="dashboard-chip">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="dashboard-highlight-grid">
          <DashboardHighlightCard
            label="분석 대기"
            value={`${summary?.queuedJobCount ?? 0}건`}
          />
          <DashboardHighlightCard
            label="분석 중"
            value={`${summary?.runningJobCount ?? 0}건`}
            tone="warning"
          />
          <DashboardHighlightCard
            label="검토 대기"
            value={`${summary?.pendingReviewCount ?? 0}건`}
            tone="danger"
          />
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
            description="범위를 정하면 점검 추세, 이상 분포, 최근 결과 요약이 한 화면에 표시됩니다."
            action={
              <Link className="btn btn-secondary" to="/plants">
                발전소 보기
              </Link>
            }
          />
        </section>
      ) : null}

      {canQuery &&
      (summaryQuery.isLoading ||
        actionStatsQuery.isLoading ||
        severityStatsQuery.isLoading ||
        trendsQuery.isLoading) &&
      !summary ? (
        <LoadingState message="대시보드를 불러오는 중입니다." />
      ) : null}

      {canQuery &&
      (summaryQuery.isError ||
        actionStatsQuery.isError ||
        severityStatsQuery.isError ||
        trendsQuery.isError) ? (
        <ErrorState
          title="대시보드를 불러오지 못했습니다."
          description={getApiErrorMessage(
            summaryQuery.error ??
              actionStatsQuery.error ??
              severityStatsQuery.error ??
              trendsQuery.error,
          )}
        />
      ) : null}

      {canQuery && summary ? (
        <>
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

          <section className="dashboard-chart-grid">
            <article className="panel dashboard-card dashboard-chart-panel">
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
              <div className="dashboard-trend-footer">
                <MiniInsight
                  label="완료 점검"
                  value={`${summary.completedInspectionCount}건`}
                />
                <MiniInsight
                  label="분석 성공"
                  value={`${summary.succeededJobCount}건`}
                />
                <MiniInsight
                  label="이상 결과"
                  value={`${summary.anomalyResultCount}건`}
                />
              </div>
            </article>

            <div className="dashboard-side-stack">
              <article className="panel dashboard-card dashboard-card-compact">
                <div className="section-header">
                  <div>
                    <h2 className="panel-title">이상 심각도 분포</h2>
                    <p className="panel-description">
                      현재 범위에서 많이 나타나는 심각도를 확인합니다.
                    </p>
                  </div>
                </div>
                <DistributionPanel items={severityItems} tone="danger" />
              </article>

              <article className="panel dashboard-card dashboard-card-compact">
                <div className="section-header">
                  <div>
                    <h2 className="panel-title">분석/검토 상태</h2>
                    <p className="panel-description">
                      검토 대기와 처리 상태를 compact stat으로 확인합니다.
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
                <div className="dashboard-snapshot-list">
                  <SnapshotRow
                    label="총 분석 작업"
                    value={`${summary.totalAnalysisJobCount}건`}
                  />
                  <SnapshotRow
                    label="분석 대기"
                    value={`${summary.queuedJobCount}건`}
                  />
                  <SnapshotRow
                    label="저신뢰 결과"
                    value={`${summary.lowConfidenceResultCount}건`}
                  />
                  <SnapshotRow
                    label="실패"
                    value={`${summary.failedJobCount}건`}
                    tone="danger"
                  />
                </div>
              </article>
            </div>
          </section>

          <section className="dashboard-bottom-grid">
            <article className="panel dashboard-card dashboard-card-compact">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">권장 조치 분포</h2>
                  <p className="panel-description">
                    어떤 조치 후보가 많이 발생하는지 빠르게 파악합니다.
                  </p>
                </div>
              </div>
              <DistributionPanel items={actionItems} tone="sky" />
            </article>

            <article className="panel dashboard-card dashboard-summary-panel">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">최근 요약</h2>
                  <p className="panel-description">
                    최근 분석 결과와 우선 확인 대상을 짧게 정리합니다.
                  </p>
                </div>
              </div>
              <div className="dashboard-summary-columns">
                <div className="stack-sm">
                  <span className="dashboard-section-label">
                    우선 확인 대상
                  </span>
                  {priorityTargets.slice(0, 4).map((target, index) => (
                    <article
                      key={`${target.resultId}-${index}`}
                      className="dashboard-summary-item"
                    >
                      <div className="dashboard-summary-item-main">
                        <div className="dashboard-summary-item-top">
                          <strong>{`우선 확인 대상 ${index + 1}`}</strong>
                          <span className="dashboard-summary-tag">
                            {getPriorityLevelLabel(target.priorityLevel)}
                          </span>
                        </div>
                        <p>{`결과 #${target.resultId ?? "-"} · ${getSeverityLevelLabel(target.severityLevel)}`}</p>
                        <p>{getPriorityReasonText(target.priorityReason)}</p>
                      </div>
                      {target.resultId ? (
                        <Link
                          className="text-button dashboard-summary-link"
                          to={`/results/${target.resultId}`}
                        >
                          결과 보기
                        </Link>
                      ) : null}
                    </article>
                  ))}
                  {priorityTargets.length === 0 ? (
                    <SingleEmptyMessage
                      title="우선 확인 대상이 없습니다."
                      description="현재 조건에서 즉시 확인할 결과가 없습니다."
                    />
                  ) : null}
                </div>
                <div className="stack-sm">
                  <span className="dashboard-section-label">
                    최근 분석 결과
                  </span>
                  {recentResults.slice(0, 4).map((result) => (
                    <article
                      key={result.resultId ?? result.inspectionId ?? "recent"}
                      className="dashboard-summary-item"
                    >
                      <div className="dashboard-summary-item-main">
                        <div className="dashboard-summary-item-top">
                          <strong>
                            {result.inspectionName ??
                              `결과 #${result.resultId ?? "-"}`}
                          </strong>
                          <span className="dashboard-summary-tag">
                            {getPriorityLevelLabel(result.priorityLevel)}
                          </span>
                        </div>
                        <p>{`${result.plantName ?? "발전소 미지정"} · ${result.zoneName ?? "구역 미지정"}`}</p>
                        <p>
                          {`최근 분석 ${formatDateTime(result.analyzedAt)} · `}
                          {`${getSeverityLevelLabel(result.severityLevel)} · ${getActionCandidateLabel(result.actionCandidate)}`}
                        </p>
                      </div>
                      {result.resultId ? (
                        <Link
                          className="text-button dashboard-summary-link"
                          to={`/results/${result.resultId}`}
                        >
                          결과 보기
                        </Link>
                      ) : null}
                    </article>
                  ))}
                  {recentResults.length === 0 ? (
                    <SingleEmptyMessage
                      title="최근 분석 결과가 없습니다."
                      description="분석이 완료되면 최근 결과가 이 영역에 표시됩니다."
                    />
                  ) : null}
                </div>
              </div>
            </article>
          </section>
        </>
      ) : null}
    </section>
  );
}

function DashboardHighlightCard({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "warning" | "danger";
  value: string;
}) {
  return (
    <article className={`dashboard-highlight dashboard-highlight-${tone}`}>
      <span className="dashboard-highlight-label">{label}</span>
      <strong className="dashboard-highlight-value">{value}</strong>
    </article>
  );
}

function MiniInsight({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-mini-insight">
      <span className="dashboard-mini-insight-label">{label}</span>
      <strong className="dashboard-mini-insight-value">{value}</strong>
    </div>
  );
}

function SnapshotRow({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "danger";
  value: string;
}) {
  return (
    <div className="dashboard-snapshot-row">
      <span
        className={`dashboard-snapshot-label dashboard-snapshot-label-${tone}`}
      >
        {label}
      </span>
      <strong className="dashboard-snapshot-value">{value}</strong>
    </div>
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

function toInterval(value: string | null): DashboardTrendInterval {
  if (value === "WEEKLY" || value === "MONTHLY") {
    return value;
  }

  return "DAILY";
}
