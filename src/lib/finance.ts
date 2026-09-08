export type FinanceValue = string | number | null

export type FinanceRow = {
  municipality: string
  county: string | null
  fiscal_year: number
  population: number | null
  property_tax_rate: number | null
  effective_tax_rate: number | null
  county_property_tax_rate: number | null
  assessed_valuation: number | null
  property_tax_levy: number | null
  total_revenue: number | null
  total_expenditure: number | null
  general_fund_revenue: number | null
  general_fund_expenditure: number | null
  property_tax_revenue: number | null
  sales_tax_revenue: number | null
  debt_outstanding: number | null
  fund_balance: number | null
  public_safety_expenditure: number | null
  police_expenditure: number | null
  fire_expenditure: number | null
  parks_recreation_expenditure: number | null
  transportation_expenditure: number | null
  public_works_expenditure: number | null
  general_government_expenditure: number | null
  administrative_expenditure: number | null
  planning_development_expenditure: number | null
  debt_service_expenditure: number | null
  sanitation_expenditure: number | null
  cultural_recreation_expenditure: number | null
  utilities_expenditure: number | null
  other_expenditure: number | null
  spending_per_capita: number | null
  revenue_per_capita: number | null
  property_tax_per_capita: number | null
  debt_per_capita: number | null
  public_safety_per_capita: number | null
  public_safety_pct: number | null
  police_per_capita: number | null
  police_pct: number | null
  fire_per_capita: number | null
  fire_pct: number | null
  parks_recreation_per_capita: number | null
  parks_recreation_pct: number | null
  transportation_per_capita: number | null
  transportation_pct: number | null
  public_works_per_capita: number | null
  public_works_pct: number | null
  general_government_per_capita: number | null
  general_government_pct: number | null
  administrative_per_capita: number | null
  administrative_pct: number | null
  planning_development_per_capita: number | null
  planning_development_pct: number | null
  debt_service_per_capita: number | null
  debt_service_pct: number | null
  sanitation_per_capita: number | null
  sanitation_pct: number | null
  cultural_recreation_per_capita: number | null
  cultural_recreation_pct: number | null
  utilities_per_capita: number | null
  utilities_pct: number | null
  other_per_capita: number | null
  other_pct: number | null
}

export type NumericKey = {
  [K in keyof FinanceRow]: FinanceRow[K] extends number | null ? K : never
}[keyof FinanceRow]

export type MetricOption = {
  label: string
  key: NumericKey
  format: "money" | "count" | "rate" | "percent"
}

export const DEFAULT_MUNICIPALITIES = ["Boone", "Wilson", "Morrisville", "Apex"]

export const OVERVIEW_METRICS: MetricOption[] = [
  { label: "Spending per resident", key: "spending_per_capita", format: "money" },
  { label: "Revenue per resident", key: "revenue_per_capita", format: "money" },
  { label: "Property tax rate", key: "property_tax_rate", format: "rate" },
  { label: "Effective tax rate", key: "effective_tax_rate", format: "rate" },
  { label: "Population", key: "population", format: "count" },
  { label: "Total revenue", key: "total_revenue", format: "money" },
  { label: "Total expenditures", key: "total_expenditure", format: "money" },
  { label: "Debt per resident", key: "debt_per_capita", format: "money" },
  { label: "Property tax revenue", key: "property_tax_revenue", format: "money" },
  { label: "Fund balance", key: "fund_balance", format: "money" },
]

export const BUDGET_METRICS: MetricOption[] = [
  { label: "Total revenue", key: "total_revenue", format: "money" },
  { label: "Total expenditures", key: "total_expenditure", format: "money" },
  { label: "Spending per resident", key: "spending_per_capita", format: "money" },
  { label: "Revenue per resident", key: "revenue_per_capita", format: "money" },
  { label: "Debt per resident", key: "debt_per_capita", format: "money" },
  { label: "Property tax revenue", key: "property_tax_revenue", format: "money" },
]

export const TREND_METRICS: MetricOption[] = [
  { label: "Property tax rate", key: "property_tax_rate", format: "rate" },
  { label: "Effective tax rate", key: "effective_tax_rate", format: "rate" },
  { label: "Total spending", key: "total_expenditure", format: "money" },
  { label: "Spending per resident", key: "spending_per_capita", format: "money" },
  { label: "Revenue per resident", key: "revenue_per_capita", format: "money" },
  { label: "Property tax levy", key: "property_tax_levy", format: "money" },
  { label: "Debt outstanding", key: "debt_outstanding", format: "money" },
  { label: "Parks spending per resident", key: "parks_recreation_per_capita", format: "money" },
  { label: "Public safety per resident", key: "public_safety_per_capita", format: "money" },
]

export const PEER_METRICS: MetricOption[] = [
  { label: "Property tax rate", key: "property_tax_rate", format: "rate" },
  { label: "Spending per resident", key: "spending_per_capita", format: "money" },
  { label: "Revenue per resident", key: "revenue_per_capita", format: "money" },
  { label: "Debt per resident", key: "debt_per_capita", format: "money" },
  { label: "Parks spending per resident", key: "parks_recreation_per_capita", format: "money" },
  { label: "Public safety per resident", key: "public_safety_per_capita", format: "money" },
  { label: "Administration per resident", key: "administrative_per_capita", format: "money" },
]

export const CATEGORIES = [
  ["Public Safety", "public_safety"],
  ["Police", "police"],
  ["Fire", "fire"],
  ["Parks & Recreation", "parks_recreation"],
  ["Transportation", "transportation"],
  ["Public Works", "public_works"],
  ["General Government", "general_government"],
  ["Administration", "administrative"],
  ["Planning & Development", "planning_development"],
  ["Debt Service", "debt_service"],
  ["Sanitation", "sanitation"],
  ["Cultural & Recreation", "cultural_recreation"],
  ["Utilities", "utilities"],
  ["Other", "other"],
] as const

export const PROFILE_FIELDS: Array<[string, NumericKey, MetricOption["format"]]> = [
  ["Population", "population", "count"],
  ["Property tax rate", "property_tax_rate", "rate"],
  ["Effective tax rate", "effective_tax_rate", "rate"],
  ["Assessed valuation", "assessed_valuation", "money"],
  ["Property tax levy", "property_tax_levy", "money"],
  ["Total revenue", "total_revenue", "money"],
  ["Total expenditures", "total_expenditure", "money"],
  ["Spending per resident", "spending_per_capita", "money"],
  ["Revenue per resident", "revenue_per_capita", "money"],
  ["Debt per resident", "debt_per_capita", "money"],
  ["Fund balance", "fund_balance", "money"],
  ["Public safety per resident", "public_safety_per_capita", "money"],
  ["Parks per resident", "parks_recreation_per_capita", "money"],
  ["Transportation per resident", "transportation_per_capita", "money"],
  ["Administration per resident", "administrative_per_capita", "money"],
]

export function formatValue(
  value: number | null | undefined,
  format: MetricOption["format"],
  compact = false,
) {
  if (value === null || value === undefined || Number.isNaN(value)) return "Not reported"
  if (format === "rate") return `$${value.toFixed(4)} per $100`
  if (format === "percent") return `${value.toFixed(1)}%`
  if (format === "count") return Math.round(value).toLocaleString("en-US")
  if (compact) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) < 100_000 ? 2 : 0,
  }).format(value)
}

export function median(values: Array<number | null | undefined>) {
  const reported = values.filter((value): value is number => value !== null && value !== undefined)
    .sort((a, b) => a - b)
  if (!reported.length) return null
  const middle = Math.floor(reported.length / 2)
  return reported.length % 2 ? reported[middle] : (reported[middle - 1] + reported[middle]) / 2
}

export function categoryKeys(stem: (typeof CATEGORIES)[number][1]) {
  return {
    expenditure: `${stem}_expenditure` as NumericKey,
    perCapita: `${stem}_per_capita` as NumericKey,
    percent: `${stem}_pct` as NumericKey,
  }
}
