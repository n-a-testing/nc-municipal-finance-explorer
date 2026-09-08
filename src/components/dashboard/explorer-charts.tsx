"use client"

import { useId } from "react"
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList,
  Line, LineChart, ReferenceLine, XAxis, YAxis, type TooltipContentProps,
} from "recharts"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { formatValue, type FinanceRow, type MetricOption, type NumericKey } from "@/lib/finance"
import { BROAD_FUNCTIONS, NC_COLORS, composition, reported, shortValue, trendPoints } from "@/lib/explorer"
import { EmptyChart, Legend } from "./explorer-controls"

const grid = "#e9edf3"
const emptyConfig = {} satisfies ChartConfig

function DetailTooltip({ active, payload, label, format = "money" }: Partial<Pick<TooltipContentProps<number, string>, "active" | "payload" | "label">> & { format?: MetricOption["format"] }) {
  if (!active || !payload?.length) return null
  return <div className="data-tooltip">
    <strong>{payload[0]?.payload?.name ?? (typeof label === "number" ? `FY ${label}` : label)}</strong>
    {payload.filter((item) => reported(item.value)).map((item, index) => <div key={`${item.dataKey}-${index}`}>
      <span><i style={{ backgroundColor: item.color ?? NC_COLORS.navy }} />{item.name}</span>
      <b>{formatValue(Number(item.value), format)}</b>
    </div>)}
  </div>
}

export function MetricBars({ rows, field, format, colors, median, highlight }: {
  rows: FinanceRow[]; field: NumericKey; format: MetricOption["format"]; colors: Record<string, string>; median?: number | null; highlight?: string
}) {
  const points = rows.filter((row) => reported(row[field])).map((row) => ({
    name: row.municipality, value: row[field] as number, display: shortValue(row[field], format),
  })).sort((a, b) => b.value - a.value)
  if (!points.length) return <EmptyChart />
  return <div className="chart-scroll" role="region" aria-label="Municipality ranking chart" tabIndex={0}>
    <ChartContainer config={emptyConfig} className="min-w-[390px] w-full aspect-auto" style={{ height: Math.max(266, points.length * 54 + 50) }}>
      <BarChart data={points} accessibilityLayer layout="vertical" margin={{ top: 12, right: 66, bottom: 2, left: 2 }}>
        <CartesianGrid horizontal={false} stroke={grid} strokeDasharray="3 4" />
        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => shortValue(Number(value), format)} tickMargin={10} tick={{ fontSize: 10 }} />
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={108} tick={{ fontSize: 11, fill: "#46566d" }} />
        <ChartTooltip cursor={{ fill: "#f4f6fa" }} content={(props) => <DetailTooltip {...props} format={format} />} />
        {reported(median) && <ReferenceLine x={median} stroke="#8a97aa" strokeDasharray="4 4" />}
        <Bar dataKey="value" name="Reported value" radius={[0, 5, 5, 0]} maxBarSize={25} isAnimationActive={false}>
          {points.map((point) => <Cell key={point.name} fill={highlight ? (point.name === highlight ? NC_COLORS.navy : NC_COLORS.peer) : (colors[point.name] ?? NC_COLORS.navy)} />)}
          <LabelList dataKey="display" position="right" offset={9} className="fill-slate-700 text-[11px] font-semibold" />
        </Bar>
      </BarChart>
    </ChartContainer>
  </div>
}

export function HistoryChart({ data, names, years, field, format, colors, compact = false }: {
  data: FinanceRow[]; names: string[]; years: number[]; field: NumericKey; format: MetricOption["format"]; colors: Record<string, string>; compact?: boolean
}) {
  const points = trendPoints(data, names, field, years)
  if (!data.some((row) => names.includes(row.municipality) && reported(row[field]))) return <EmptyChart message="No historical values are reported for the selected measure." />
  const config = Object.fromEntries(names.map((name, i) => [`city${i}`, { label: name, color: colors[name] }])) satisfies ChartConfig
  return <>
    <div className="chart-scroll" role="region" aria-label="Financial history chart" tabIndex={0}>
      <ChartContainer config={config} className="min-w-[380px] w-full aspect-auto" style={{ height: compact ? 266 : 370 }}>
        <LineChart data={points} accessibilityLayer margin={{ top: 18, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3 4" />
          <XAxis dataKey="year" tickFormatter={(value) => `FY ${value}`} axisLine={false} tickLine={false} tickMargin={12} padding={{ left: 15, right: 15 }} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(value) => shortValue(Number(value), format)} axisLine={false} tickLine={false} width={68} tick={{ fontSize: 10 }} />
          <ChartTooltip content={(props) => <DetailTooltip {...props} format={format} />} cursor={{ stroke: "#d0d9e6", strokeDasharray: "4 4" }} />
          {names.map((name, i) => <Line key={name} type="linear" dataKey={`city${i}`} name={name} stroke={colors[name]} strokeWidth={2.5} connectNulls={false} dot={{ r: 4, fill: "white", strokeWidth: 2.5 }} activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }} isAnimationActive={false} />)}
        </LineChart>
      </ChartContainer>
    </div>
    <Legend items={names.map((name) => ({ name, color: colors[name] }))} />
  </>
}

export function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
  const id = useId().replace(/:/g, "")
  return <ChartContainer config={emptyConfig} className="h-11 w-24 aspect-auto" aria-hidden="true">
    <AreaChart data={values.map((value, index) => ({ index, value }))} margin={{ top: 5, right: 3, bottom: 3, left: 3 }}>
      <defs><linearGradient id={`spark${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity={0.16} /><stop offset="1" stopColor={color} stopOpacity={0} /></linearGradient></defs>
      <Area dataKey="value" type="linear" stroke={color} fill={`url(#spark${id})`} strokeWidth={1.7} dot={{ r: 2, fill: color, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} />
    </AreaChart>
  </ChartContainer>
}

export function BalanceChart({ rows, perCapita }: { rows: FinanceRow[]; perCapita: boolean }) {
  const data = rows.map((row) => ({ name: row.municipality, revenue: perCapita ? row.revenue_per_capita : row.total_revenue, spending: perCapita ? row.spending_per_capita : row.total_expenditure }))
  if (!data.some((row) => reported(row.revenue) || reported(row.spending))) return <EmptyChart />
  return <>
    <Legend items={[{ name: "Revenue", color: NC_COLORS.navy }, { name: "Expenditures", color: NC_COLORS.red }]} />
    <div className="chart-scroll" role="region" aria-label="Revenue versus expenditure chart" tabIndex={0}>
      <ChartContainer config={emptyConfig} className="w-full aspect-auto" style={{ height: 310, minWidth: Math.max(390, data.length * 95) }}>
        <BarChart data={data} accessibilityLayer margin={{ top: 15, left: 0, right: 8, bottom: 4 }} barGap={4}>
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3 4" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} tick={{ fontSize: 11 }} interval={0} />
          <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => shortValue(Number(value))} width={66} tick={{ fontSize: 10 }} />
          <ChartTooltip cursor={{ fill: "#f7f9fc" }} content={(props) => <DetailTooltip {...props} />} />
          <Bar dataKey="revenue" name="Revenue" fill={NC_COLORS.navy} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Bar dataKey="spending" name="Expenditures" fill={NC_COLORS.red} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
    </div>
  </>
}

export function CompositionChart({ rows }: { rows: FinanceRow[] }) {
  const data = rows.flatMap((row) => { const shares = composition(row); return shares ? [{ name: row.municipality, ...shares }] : [] })
  if (!data.length) return <EmptyChart message="A composition chart needs complete, non-overlapping broad categories that reconcile with total spending. None of these municipalities meet that requirement." />
  return <>
    <div className="chart-scroll" role="region" aria-label="Spending composition chart" tabIndex={0}>
      <ChartContainer config={emptyConfig} className="min-w-[440px] w-full aspect-auto" style={{ height: Math.max(240, data.length * 60 + 50) }}>
        <BarChart data={data} accessibilityLayer layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 2 }}>
          <XAxis type="number" domain={[0, 102]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tickMargin={10} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" width={108} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <ChartTooltip content={(props) => <DetailTooltip {...props} format="percent" />} cursor={false} />
          {BROAD_FUNCTIONS.map(({ key, label, color }, i) => <Bar key={key} dataKey={key} name={label} stackId="spending" fill={color} radius={i === 0 ? [4, 0, 0, 4] : i === BROAD_FUNCTIONS.length - 1 ? [0, 4, 4, 0] : 0} maxBarSize={32} stroke="white" strokeWidth={1} isAnimationActive={false} />)}
        </BarChart>
      </ChartContainer>
    </div>
    <Legend items={BROAD_FUNCTIONS.map(({ label, color }) => ({ name: label, color }))} />
    {data.length < rows.length && <p className="chart-footnote">Excluded: {rows.filter((row) => !composition(row)).map((row) => row.municipality).join(", ")} — incomplete or unreconciled broad categories.</p>}
  </>
}
