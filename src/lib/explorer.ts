import type { FinanceRow, MetricOption, NumericKey } from "./finance"

// Flag-inspired colors; gold is deepened for legibility on light chart surfaces.
export const NC_COLORS = { navy: "#17234b", red: "#ae2433", gold: "#bd8618", blue: "#527ca4", peer: "#b7c6db" }
export const CITY_COLORS = [NC_COLORS.navy, NC_COLORS.red, NC_COLORS.gold, NC_COLORS.blue, "#783d48", "#6b8299", "#965322", "#3e6474"]
export const BROAD_FUNCTIONS = [
  { label: "Public safety", key: "public_safety_expenditure", color: NC_COLORS.navy },
  { label: "Transportation", key: "transportation_expenditure", color: NC_COLORS.blue },
  { label: "General government", key: "general_government_expenditure", color: NC_COLORS.red },
  { label: "Debt service", key: "debt_service_expenditure", color: NC_COLORS.gold },
  { label: "Utilities", key: "utilities_expenditure", color: "#91acc4" },
  { label: "Other", key: "other_expenditure", color: "#adb7c5" },
] as const

export function reported(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

export function shortValue(value: number | null | undefined, format: MetricOption["format"] = "money") {
  if (!reported(value)) return "—"
  if (format === "rate") return `$${value.toFixed(3)}`
  if (format === "percent") return `${value.toFixed(1)}%`
  return new Intl.NumberFormat("en-US", {
    ...(format === "money" ? { style: "currency", currency: "USD" } : {}),
    notation: Math.abs(value) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 10_000 ? 1 : 0,
  }).format(value)
}

export function medianValue(values: unknown[]) {
  const sorted = values.filter(reported).sort((a, b) => a - b)
  if (!sorted.length) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function estimateTax(value: number, rate: number | null, countyRate?: number | null) {
  if (!reported(value) || value < 0 || !reported(rate)) return null
  // A combined estimate must not silently fall back to municipal-only tax.
  if (countyRate !== undefined && !reported(countyRate)) return null
  return value * (rate + (countyRate ?? 0)) / 100
}

export function composition(row: FinanceRow) {
  if (!reported(row.total_expenditure) || row.total_expenditure <= 0) return null
  const values = BROAD_FUNCTIONS.map(({ key }) => row[key])
  if (!values.every((value) => reported(value) && value >= 0)) return null
  const sum = values.reduce<number>((total, value) => total + (value ?? 0), 0)
  if (Math.abs(sum - row.total_expenditure) / row.total_expenditure > 0.02) return null
  return Object.fromEntries(BROAD_FUNCTIONS.map(({ key }) => [key, row[key]! / row.total_expenditure! * 100]))
}

export type PeerMode = "population" | "county" | "all" | "selected"
export function peersFor(rows: FinanceRow[], subject: FinanceRow, mode: PeerMode, selected: string[]) {
  return rows.filter((row) => {
    if (row.municipality === subject.municipality) return false
    if (mode === "all") return true
    if (mode === "selected") return selected.includes(row.municipality)
    if (mode === "county") return Boolean(subject.county && row.county && row.county === subject.county)
    return reported(subject.population) && subject.population > 0 && reported(row.population)
      && row.population >= subject.population * 0.75 && row.population <= subject.population * 1.25
  })
}

export function trendPoints(rows: FinanceRow[], names: string[], key: NumericKey, years: number[]) {
  // Preserve missing years in the series so lines never bridge unreported data.
  return [...years].sort((a, b) => a - b).map((year) => ({
    year,
    ...Object.fromEntries(names.map((name, i) => {
      const value = rows.find((row) => row.municipality === name && row.fiscal_year === year)?.[key]
      return [`city${i}`, reported(value) ? value : null]
    })),
  }))
}
