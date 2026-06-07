type StatusBadgeProps = {
  label: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

export function StatusBadge({
  label,
  tone = 'default',
}: StatusBadgeProps) {
  return <span className={`status-badge status-badge-${tone}`}>{label}</span>
}
