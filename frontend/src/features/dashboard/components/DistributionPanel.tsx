type DistributionItem = {
  label: string;
  value: number;
  hint?: string;
};

type DistributionPanelProps = {
  items: DistributionItem[];
  tone?: "danger" | "sky";
};

export function DistributionPanel({
  items,
  tone = "sky",
}: DistributionPanelProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="dashboard-distribution">
      {items.map((item) => {
        const ratio = total > 0 ? (item.value / total) * 100 : 0;

        return (
          <div key={item.label} className="dashboard-distribution-row">
            <div className="dashboard-distribution-header">
              <div>
                <strong>{item.label}</strong>
                {item.hint ? <span>{item.hint}</span> : null}
              </div>
              <div className="dashboard-distribution-meta">
                <strong>{`${item.value}건`}</strong>
                <span>{`${Math.round(ratio)}%`}</span>
              </div>
            </div>
            <div className="dashboard-distribution-track">
              <div
                className={`dashboard-distribution-fill dashboard-distribution-fill-${tone}`}
                style={{
                  width: `${Math.max((item.value / max) * 100, item.value > 0 ? 8 : 0)}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
