import type { DashboardTrendPoint } from "../types";

type TrendChartProps = {
  points: DashboardTrendPoint[];
};

const TREND_CHART_HEIGHT = 220;
const TREND_GUIDE_COUNT = 4;

export function TrendChart({ points }: TrendChartProps) {
  const max = Math.max(
    ...points.map((point) =>
      Math.max(point.inspectionCount, point.anomalyCount),
    ),
    1,
  );
  const guides = Array.from({ length: TREND_GUIDE_COUNT }, (_, index) => ({
    key: `guide-${index}`,
    top: `${(index / TREND_GUIDE_COUNT) * 100}%`,
    value: Math.round((max / TREND_GUIDE_COUNT) * (TREND_GUIDE_COUNT - index)),
  }));

  return (
    <div className="dashboard-trend-chart">
      <div className="dashboard-trend-guides">
        {guides.map((guide) => (
          <div
            key={guide.key}
            className="dashboard-trend-guide"
            style={{ top: guide.top }}
          >
            <span>{guide.value}</span>
          </div>
        ))}
      </div>
      <div className="dashboard-trend-bars">
        {points.map((point) => {
          const inspectionHeight = Math.max(
            (point.inspectionCount / max) * TREND_CHART_HEIGHT,
            point.inspectionCount > 0 ? 10 : 0,
          );
          const anomalyHeight = Math.max(
            (point.anomalyCount / max) * TREND_CHART_HEIGHT,
            point.anomalyCount > 0 ? 10 : 0,
          );

          return (
            <div key={point.trendDate} className="dashboard-trend-group">
              <div className="dashboard-trend-values">
                <span>{point.inspectionCount}</span>
                <span>{point.anomalyCount}</span>
              </div>
              <div className="dashboard-trend-columns">
                <div
                  className="dashboard-trend-column dashboard-trend-column-inspection"
                  style={{ height: `${inspectionHeight}px` }}
                  title={`점검 ${point.inspectionCount}건`}
                />
                <div
                  className="dashboard-trend-column dashboard-trend-column-anomaly"
                  style={{ height: `${anomalyHeight}px` }}
                  title={`이상 ${point.anomalyCount}건`}
                />
              </div>
              <div className="dashboard-trend-labels">
                <strong>{point.trendDate}</strong>
                <span>{`점검 ${point.inspectionCount} · 이상 ${point.anomalyCount}`}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
