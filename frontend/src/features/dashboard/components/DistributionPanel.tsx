import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { EmptyState } from '../../../shared/components/state/EmptyState'

type DistributionItem = {
  label: string
  value: number
  hint?: string
  color?: string
}

type DistributionPanelProps = {
  items: DistributionItem[]
  tone?: 'danger' | 'sky'
  compact?: boolean
}

const PALETTE_DANGER = ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#ffe4e6']
const PALETTE_SKY = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe']
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#d97706',
  LOW: '#64748b',
}

export function DistributionPanel({
  items,
  tone = 'sky',
  compact = false,
}: DistributionPanelProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const palette = tone === 'danger' ? PALETTE_DANGER : PALETTE_SKY
  const chartHeight = compact ? 120 : 200
  const innerRadius = compact ? 34 : 50
  const outerRadius = compact ? 52 : 80

  if (total === 0 || items.every((item) => item.value === 0)) {
    return (
      <div className="py-4">
        <EmptyState
          title="표시할 데이터가 없습니다."
          description="분석 결과가 쌓이면 분포가 표시됩니다."
        />
      </div>
    )
  }

  const chartData = items
    .filter((item) => item.value > 0)
    .map((item) => ({ name: item.label, value: item.value }))

  const getItemColor = (item: DistributionItem, index: number) => {
    if (item.color) {
      return item.color
    }
    if (item.hint && SEVERITY_COLORS[item.hint]) {
      return SEVERITY_COLORS[item.hint]
    }
    return palette[index % palette.length]
  }

  return (
    <div>
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => {
                const sourceItem = items.find((item) => item.label === entry.name)
                const fill = sourceItem
                  ? getItemColor(sourceItem, index)
                  : palette[index % palette.length]
                return <Cell key={index} fill={fill} />
              })}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0',
                fontSize: '0.8rem',
                padding: '0.4rem 0.65rem',
              }}
              formatter={(value: number) => [`${value}건`]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="distribution-table">
        {items.map((item, index) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
          const itemColor = getItemColor(item, index)
          return (
            <div key={item.label} className="distribution-table-row">
              <span className="distribution-table-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: itemColor,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                {item.label}
                {item.hint ? (
                  <span className="text-xs text-slate-400 ml-1">{item.hint}</span>
                ) : null}
              </span>
              <span>
                <span className="distribution-table-value">{item.value}건</span>
                <span className="distribution-table-pct">{pct}%</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
