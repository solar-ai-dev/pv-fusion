import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardTrendPoint } from '../types'

type TrendChartProps = {
  points: DashboardTrendPoint[]
}

export function TrendChart({ points }: TrendChartProps) {
  if (points.length === 0) {
    return null
  }

  const data = points.map((point) => ({
    date: point.trendDate,
    점검: point.inspectionCount,
    이상: point.anomalyCount,
  }))

  return (
    <div className="chart-container" style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              fontSize: '0.8rem',
              padding: '0.5rem 0.75rem',
            }}
            formatter={(value: number, name: string) => [`${value}건`, name]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }}
          />
          <Line
            type="monotone"
            dataKey="점검"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="이상"
            stroke="#f43f5e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
