type DashboardKpiCardProps = {
  label: string;
  value: string;
  description: string;
  delta?: string;
  tone?: "default" | "sky" | "amber" | "rose";
};

export function DashboardKpiCard({
  delta,
  description,
  label,
  tone = "default",
  value,
}: DashboardKpiCardProps) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-${tone}`}>
      <div className="dashboard-kpi-card-header">
        <span className="dashboard-kpi-card-label">{label}</span>
        {delta ? (
          <span className="dashboard-kpi-card-delta">{delta}</span>
        ) : null}
      </div>
      <strong className="dashboard-kpi-card-value">{value}</strong>
      <p className="dashboard-kpi-card-description">{description}</p>
    </article>
  );
}
