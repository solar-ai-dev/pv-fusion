export type StatusBadgeTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'slate'
  | 'sky'
  | 'emerald'
  | 'amber'
  | 'cyan'
  | 'orange'

type StatusBadgeProps = {
  label: string
  tone?: StatusBadgeTone
}

export function StatusBadge({
  label,
  tone = 'default',
}: StatusBadgeProps) {
  return <span className={`status-badge status-badge-${tone}`}>{label}</span>
}
