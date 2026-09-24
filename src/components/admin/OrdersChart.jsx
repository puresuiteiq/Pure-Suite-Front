import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '../../hooks/useTheme'

// Single-series bar chart → one brand hue (the `brand-600` token in index.css),
// rendered as a light→dark vertical gradient for depth. Keeping the series in its
// own reliable hue (independent of the panel accent) is deliberate: chart marks
// carry data, and text/axes stay in slate ink tokens, never the series color.
// Recharts needs literal colors, so grid/axis lines are picked per theme.
const BRAND = '#2148f5'
const BRAND_LIGHT = '#6d8cff'
const INK_MUTED = '#94a3b8' // slate-400

const yTickFormatter = (value) =>
  value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/95">
      <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-slate-500 dark:text-slate-300">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: BRAND }}
        />
        <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
          {payload[0].value.toLocaleString()}
        </span>
        orders
      </p>
    </div>
  )
}

/**
 * "Orders — last 30 days" bar chart. The card supplies the title, so no legend
 * or in-chart heading is needed (single series).
 */
export default function OrdersChart({ data }) {
  const { theme } = useTheme()
  const grid = theme === 'dark' ? '#273248' : '#eef2f7'
  const axis = theme === 'dark' ? '#3a465f' : '#e2e8f0'

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="ordersBarFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND_LIGHT} />
              <stop offset="100%" stopColor={BRAND} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3 5" />
          <XAxis
            dataKey="date"
            // Recharts drops ticks that would collide. A fixed every-5th
            // interval ran the dates into each other on a 320px phone.
            interval="preserveStartEnd"
            minTickGap={14}
            tickLine={false}
            axisLine={{ stroke: axis }}
            tick={{ fontSize: 11, fill: INK_MUTED }}
            dy={6}
          />
          <YAxis
            width={40}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: INK_MUTED }}
            tickFormatter={yTickFormatter}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: 'rgba(33, 72, 245, 0.08)', radius: 6 }}
          />
          <Bar
            dataKey="orders"
            fill="url(#ordersBarFill)"
            radius={[6, 6, 0, 0]}
            maxBarSize={22}
            activeBar={{ fill: BRAND, radius: [6, 6, 0, 0] }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
