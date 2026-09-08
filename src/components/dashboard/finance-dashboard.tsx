"use client"

import { useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Calculator,
  Check, Landmark, Layers3, RotateCcw, Scale, TrendingUp, Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  CATEGORIES, DEFAULT_MUNICIPALITIES, OVERVIEW_METRICS, PEER_METRICS, PROFILE_FIELDS, TREND_METRICS,
  categoryKeys, formatValue, type FinanceRow, type NumericKey,
} from "@/lib/finance"
import { CITY_COLORS, NC_COLORS, estimateTax, medianValue, peersFor, reported, shortValue, type PeerMode } from "@/lib/explorer"
import { BalanceChart, CompositionChart, HistoryChart, MetricBars, Sparkline } from "./explorer-charts"
import { Choice, CityPicker, FinanceTable, MissingNote, Notice, Panel, type Column } from "./explorer-controls"

const NAV = [
  { key: "compare", label: "Compare", icon: BarChart3, title: "Municipal finances, in perspective.", description: "One fiscal year. A shared set of measures. A clearer picture of your municipalities." },
  { key: "spending", label: "Spending", icon: Layers3, title: "Follow the money.", description: "Compare the size of local budgets, then explore the services those dollars support." },
  { key: "taxes", label: "Taxes", icon: Calculator, title: "Put property taxes in context.", description: "Compare published rates and see what they mean for a hypothetical property." },
  { key: "trends", label: "Trends", icon: TrendingUp, title: "See what changed over time.", description: "Track the same measure across municipalities, without losing sight of missing data." },
  { key: "peers", label: "Peers", icon: Users, title: "Make a fairer comparison.", description: "Choose an explicit peer group. Compare reported measures—not an overall ranking of government quality." },
  { key: "data", label: "Data & notes", icon: BookOpen, title: "The numbers behind the charts.", description: "See every municipality in one table and understand the reported values and limitations." },
] as const

const TABLE_COLUMNS: Column[] = [
  { label: "Population", key: "population", format: "count" },
  { label: "Tax / $100", key: "property_tax_rate", format: "rate" },
  { label: "Revenue", key: "total_revenue", format: "money" },
  { label: "Expenditures", key: "total_expenditure", format: "money" },
  { label: "Spending / resident", key: "spending_per_capita", format: "money" },
  { label: "Revenue / resident", key: "revenue_per_capita", format: "money" },
  { label: "Debt / resident", key: "debt_per_capita", format: "money" },
  { label: "Fund balance", key: "fund_balance", format: "money" },
]

function formatNote(key: NumericKey) {
  if (key.includes("rate")) return "Dollars per $100 of assessed value"
  if (key.includes("per_capita")) return "Dollars per resident"
  if (key === "population") return "Estimated residents"
  return "Nominal dollars · not inflation-adjusted"
}

export function FinanceDashboard({ data }: { data: FinanceRow[] }) {
  const years = useMemo(() => [...new Set(data.map((row) => row.fiscal_year))].sort((a, b) => b - a), [data])
  const names = useMemo(() => [...new Set(data.map((row) => row.municipality))].sort(), [data])
  const defaults = DEFAULT_MUNICIPALITIES.filter((name) => names.includes(name))
  const [active, setActive] = useState("compare")
  const [year, setYear] = useState(years[0])
  const [selected, setSelected] = useState(defaults.length ? defaults : names.slice(0, 4))
  const [metricKey, setMetricKey] = useState<NumericKey>("spending_per_capita")
  const [balanceUnit, setBalanceUnit] = useState("resident")
  const [category, setCategory] = useState<(typeof CATEGORIES)[number][1]>("public_safety")
  const [categoryUnit, setCategoryUnit] = useState("perCapita")
  const [assessed, setAssessed] = useState("400000")
  const [taxScope, setTaxScope] = useState("municipal")
  const [rateKey, setRateKey] = useState<NumericKey>("property_tax_rate")
  const [trendKey, setTrendKey] = useState<NumericKey>("spending_per_capita")
  const [subjectName, setSubjectName] = useState("Apex")
  const [peerMode, setPeerMode] = useState<PeerMode>("population")
  const [peerKey, setPeerKey] = useState<NumericKey>("spending_per_capita")
  const [tableAll, setTableAll] = useState(false)

  const yearRows = data.filter((row) => row.fiscal_year === year)
  const rows = selected.flatMap((name) => yearRows.filter((row) => row.municipality === name))
  const colors = Object.fromEntries(selected.map((name, i) => [name, CITY_COLORS[i % CITY_COLORS.length]]))
  const intro = NAV.find((item) => item.key === active) ?? NAV[0]
  const metric = OVERVIEW_METRICS.find((item) => item.key === metricKey) ?? OVERVIEW_METRICS[0]
  const middle = medianValue(rows.map((row) => row[metricKey]))
  const historyYears = [...years].sort((a, b) => a - b)
  const categoryFields = categoryKeys(category)
  const categoryField = categoryUnit === "total" ? categoryFields.expenditure : categoryUnit === "share" ? categoryFields.percent : categoryFields.perCapita
  const categoryLabel = CATEGORIES.find(([, stem]) => stem === category)?.[0] ?? "Public Safety"
  const trendMetric = TREND_METRICS.find((item) => item.key === trendKey) ?? TREND_METRICS[0]
  const subject = yearRows.find((row) => row.municipality === subjectName) ?? yearRows[0]
  const peers = subject ? peersFor(yearRows, subject, peerMode, selected) : []
  const peerMetric = PEER_METRICS.find((item) => item.key === peerKey) ?? PEER_METRICS[0]
  const peerMedian = medianValue(peers.map((row) => row[peerKey]))
  const peerValue = subject?.[peerKey]
  const difference = reported(peerValue) && reported(peerMedian) ? peerValue - peerMedian : null
  const percentDifference = reported(difference) && reported(peerMedian) && peerMedian !== 0 ? difference / peerMedian * 100 : null
  const validAssessed = assessed.trim() !== "" && Number.isFinite(Number(assessed)) && Number(assessed) >= 0
  const estimates = rows.map((row) => ({ row, value: validAssessed ? estimateTax(Number(assessed), row.property_tax_rate, taxScope === "combined" ? row.county_property_tax_rate : undefined) : null }))
  const maxEstimate = Math.max(0, ...estimates.map(({ value }) => value ?? 0))

  return <Tabs value={active} onValueChange={(value) => setActive(String(value))} className="explorer-app">
    <a href="#analysis" className="skip-link">Skip to analysis</a>
    <header className="explorer-header">
      <div className="explorer-topbar">
        <Link href="/" className="explorer-brand" aria-label="NC Municipal Finance Explorer home"><span>NC Municipal<span className="brand-subtitle">Finance Explorer</span></span></Link>
        <div className="header-context"><Button variant="secondary" className="municipality-directory-button" aria-label={`View all ${names.length} municipalities in one table`} onClick={() => { setTableAll(true); setActive("data") }}><b>{names.length}</b> municipalities <ArrowRight className="size-3.5" /></Button><span className="header-years">{Math.min(...years)}–{Math.max(...years)}</span></div>
      </div>
      <div className="explorer-nav-band"><div className="explorer-nav"><TabsList variant="line" aria-label="Explore municipal finances" className="explorer-tabs">
        {NAV.map(({ key, label, icon: Icon }) => <TabsTrigger key={key} value={key}><Icon className="size-3.5" />{label}</TabsTrigger>)}
      </TabsList></div></div>
    </header>

    <main id="analysis" className="explorer-workspace">
      <section className="workspace-heading"><div><h1>{intro.title}</h1><p>{intro.description}</p></div><div className="year-control"><Choice label="Fiscal year ending" value={String(year)} options={years.map((value) => ({ value: String(value), label: `June ${value}` }))} onChange={(value) => setYear(Number(value))} /></div></section>
      <section className="comparison-toolbar" aria-label="Comparison controls"><div className="toolbar-title"><Scale className="size-4" /><span>Comparing <b>{selected.length}</b></span></div><CityPicker names={names} selected={selected} onChange={setSelected} colors={colors} /><Button variant="ghost" size="icon" title="Reset comparison" aria-label="Reset comparison" onClick={() => { setSelected(defaults.length ? defaults : names.slice(0, 4)); setYear(years[0]) }}><RotateCcw className="size-3.5" /></Button></section>

      <TabsContent value="compare" className="view-stack">
        <div className="city-overview-strip" aria-label="Municipality snapshots">
          {rows.map((row) => <article key={row.municipality} className="city-overview-card" aria-label={`${row.municipality} financial snapshot`} style={{ "--city-color": colors[row.municipality] } as CSSProperties}>
            <div className="city-card-heading"><span><i style={{ backgroundColor: colors[row.municipality] }} />{row.municipality}</span><span className="city-card-population">{shortValue(row.population, "count")} residents</span></div>
            <div className="city-card-number"><div><strong>{shortValue(row.spending_per_capita)}</strong><span>{reported(row.spending_per_capita) ? "spending / resident" : "spending not reported"}</span></div><Sparkline color={colors[row.municipality]} values={historyYears.map((fy) => data.find((item) => item.municipality === row.municipality && item.fiscal_year === fy)?.spending_per_capita ?? null)} /></div>
            <div className="city-card-footer"><span>Municipal tax / $100</span><b>{shortValue(row.property_tax_rate, "rate")}</b></div>
          </article>)}
        </div>

        <section className="section-heading"><div><h2>Compare the same measure</h2><p>Magnitude on the left. Historical context on the right.</p></div><div className="measure-control"><Choice label="Comparison measure" value={metricKey} options={OVERVIEW_METRICS.map((item) => ({ value: item.key, label: item.label }))} onChange={(value) => setMetricKey(value as NumericKey)} /></div></section>
        <div className="chart-pair">
          <Panel title={metric.label} description={`${formatNote(metric.key)} · FY ${year}`} action={<span className="panel-tag">Current year</span>} footer={<MissingNote rows={rows} field={metricKey} />}>
            <MetricBars rows={rows} field={metricKey} format={metric.format} colors={colors} median={middle} />
            {reported(middle) && <div className="median-key"><span />Selection median <b>{shortValue(middle, metric.format)}</b></div>}
          </Panel>
          <Panel title="The longer view" description={`${metric.label} · ${historyYears[0]}–${historyYears.at(-1)}`} action={<span className="panel-tag">{years.length} fiscal years</span>} footer="Lines stop at missing observations. Values are not inflation-adjusted.">
            <HistoryChart data={data} names={selected} years={years} field={metricKey} format={metric.format} colors={colors} compact />
          </Panel>
        </div>

        <Panel title="Your municipalities, side by side" description={`All ${rows.length} selected municipalities · FY ${year}. Missing values remain clearly labeled.`} action={<span className="panel-tag">{rows.length} selected</span>}>
          <FinanceTable rows={rows} columns={TABLE_COLUMNS} colors={colors} />
          <Accordion><AccordionItem value="full-profiles"><AccordionTrigger className="mt-3 text-xs text-slate-500">More financial measures for all selected municipalities</AccordionTrigger><AccordionContent><FinanceTable rows={rows} colors={colors} columns={PROFILE_FIELDS.filter(([, key]) => !TABLE_COLUMNS.some((column) => column.key === key)).map(([label, key, format]) => ({ label, key, format }))} /></AccordionContent></AccordionItem></Accordion>
        </Panel>
        <Notice>Per-resident measures help compare different-sized municipalities. Service mix, utilities, tourism, and capital projects still matter. Higher spending is not a judgment of management quality.</Notice>
      </TabsContent>

      <TabsContent value="spending" className="view-stack">
        <nav className="section-jumps" aria-label="Spending sections"><span>Jump to</span><a href="#budget-scale">Budget scale</a><a href="#spending-mix">Spending mix</a><a href="#category-detail">Category detail</a></nav>
        <Panel id="budget-scale" title="Revenue in. Expenditures out." description="Reported municipal financial-profile totals—not just the general fund." action={<Choice label="Display amounts" value={balanceUnit} options={[{ value: "resident", label: "Per resident" }, { value: "total", label: "Total dollars" }]} onChange={setBalanceUnit} />} footer={<MissingNote rows={rows} field={balanceUnit === "resident" ? "spending_per_capita" : "total_expenditure"} />}>
          <BalanceChart rows={rows} perCapita={balanceUnit === "resident"} />
        </Panel>
        <Panel id="spending-mix" title="What each budget supports" description="Broad functions as a share of total expenditures. Each row is one municipality." action={<span className="panel-tag">Share of total</span>} footer="Only complete broad functions reconciling within 2% of total expenditures are included. Detailed subcategories are not added to these totals.">
          <CompositionChart rows={rows} />
        </Panel>
        <Panel id="category-detail" title="Explore a spending category" description="Compare functions using the official reporting categories." action={<div className="inline-controls"><Choice label="Category" value={category} options={CATEGORIES.map(([label, stem]) => ({ value: stem, label }))} onChange={(value) => setCategory(value as typeof category)} /><Choice label="Measure" value={categoryUnit} options={[{ value: "perCapita", label: "Per resident" }, { value: "total", label: "Total dollars" }, { value: "share", label: "Share of expenditures" }]} onChange={setCategoryUnit} /></div>} footer={<MissingNote rows={rows} field={categoryField} />}>
          <div className="category-detail-layout"><div><h3 className="chart-subtitle">{categoryLabel} · {categoryUnit === "share" ? "% of total expenditures" : categoryUnit === "total" ? "dollars" : "dollars per resident"}</h3><MetricBars rows={rows} field={categoryField} format={categoryUnit === "share" ? "percent" : "money"} colors={colors} /></div><div className="category-table-wrap"><FinanceTable rows={rows} colors={colors} columns={[{ label: "Per resident", key: categoryFields.perCapita, format: "money" }, { label: "Share", key: categoryFields.percent, format: "percent" }]} /><p className="chart-footnote">Police and fire can sit within public safety. Some functions are combined or not reported separately.</p></div></div>
        </Panel>
      </TabsContent>

      <TabsContent value="taxes" className="view-stack">
        <div className="tax-layout">
          <Panel title={rateKey === "property_tax_rate" ? "Published municipal tax rates" : "DOR effective municipal tax rates"} description="Dollars per $100 of assessed property value." action={<Choice label="Rate measure" value={rateKey} options={[{ value: "property_tax_rate", label: "Published rate" }, { value: "effective_tax_rate", label: "Effective rate" }]} onChange={(value) => setRateKey(value as NumericKey)} />} footer={<MissingNote rows={rows} field={rateKey} />}>
            <MetricBars rows={rows} field={rateKey} format="rate" colors={colors} />
            <p className="chart-footnote">The bill estimator always uses the published municipal rate, never the effective rate.</p>
          </Panel>
          <Panel title="What would you pay?" description="A simple estimate for the same property in each municipality." className="tax-calculator" action={<Calculator className="size-5 text-primary" />}>
            <div className="assessed-input"><Label htmlFor="assessed-value">Hypothetical assessed property value</Label><div><span>$</span><Input id="assessed-value" type="number" min="0" step="10000" value={assessed} aria-invalid={!validAssessed} onChange={(event) => setAssessed(event.target.value)} /></div>{!validAssessed && <p className="text-xs text-red-600" role="alert">Enter a non-negative assessed value.</p>}</div>
            <Choice label="Tax scope" value={taxScope} options={[{ value: "municipal", label: "Municipal only" }, { value: "combined", label: "Municipal + dominant county" }]} onChange={setTaxScope} />
            <div className="estimate-list" aria-live="polite">{estimates.map(({ row, value }) => <div key={row.municipality}><div><span><i style={{ backgroundColor: colors[row.municipality] }} />{row.municipality}</span><strong>{formatValue(value, "money")}</strong></div><div className="estimate-track"><span style={{ width: `${reported(value) && maxEstimate ? value / maxEstimate * 100 : 0}%`, background: colors[row.municipality] }} /></div></div>)}</div>
            <div className="calculator-equation">Assessed value × published rate ÷ 100 <ArrowRight className="size-3" /> annual estimate</div>
          </Panel>
        </div>
        <Notice><strong>{taxScope === "municipal" ? "Estimated municipal property tax only." : "Estimated municipal + dominant-county property tax only."}</strong> Excludes special districts, fees, exemptions, and other assessments. Assessed value is not necessarily market value. For municipalities spanning counties, the combined option uses the dominant county in this dataset; an unavailable county rate produces no combined estimate.</Notice>
        <Panel title="Tax base and collections" description={`Supporting property-tax measures · FY ${year}`}><FinanceTable rows={rows} colors={colors} columns={[{ label: "Effective rate", key: "effective_tax_rate", format: "rate" }, { label: "Assessed valuation", key: "assessed_valuation", format: "money" }, { label: "Property tax levy", key: "property_tax_levy", format: "money" }, { label: "Property tax revenue", key: "property_tax_revenue", format: "money" }]} /></Panel>
      </TabsContent>

      <TabsContent value="trends" className="view-stack">
        <Panel title={trendMetric.label} description={`All available fiscal years · ${formatNote(trendKey)}`} action={<Choice label="Trend measure" value={trendKey} options={TREND_METRICS.map((item) => ({ value: item.key, label: item.label }))} onChange={(value) => setTrendKey(value as NumericKey)} />} footer="This view uses all available years, independent of the fiscal-year filter. Straight segments join observed annual values; missing years break the line.">
          <HistoryChart data={data} names={selected} years={years} field={trendKey} format={trendMetric.format} colors={colors} />
        </Panel>
        <Panel title="Year by year" description="Exact reported values and change from the first to the last year shown."><div className="finance-table"><Table><TableHeader><TableRow><TableHead>Municipality</TableHead>{historyYears.map((fy) => <TableHead className="text-right" key={fy}>FY {fy}</TableHead>)}<TableHead className="text-right">Period change</TableHead></TableRow></TableHeader><TableBody>{selected.map((name) => { const values = historyYears.map((fy) => data.find((row) => row.municipality === name && row.fiscal_year === fy)?.[trendKey] ?? null); const first = values[0]; const last = values.at(-1); const pct = reported(first) && first !== 0 && reported(last) ? (last - first) / first * 100 : null; return <TableRow key={name}><TableCell><span className="table-city"><i style={{ backgroundColor: colors[name] }} />{name}</span></TableCell>{values.map((value, i) => <TableCell className={`text-right tabular-nums ${value === null ? "text-slate-400" : ""}`} key={historyYears[i]}>{formatValue(value, trendMetric.format)}</TableCell>)}<TableCell className="text-right">{reported(pct) ? <span className="period-change">{pct >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{Math.abs(pct).toFixed(1)}%</span> : <span className="text-slate-400">Not available</span>}</TableCell></TableRow> })}</TableBody></Table></div></Panel>
      </TabsContent>

      <TabsContent value="peers" className="view-stack">
        <div className="peer-controls"><Choice label="Focus municipality" value={subject?.municipality ?? subjectName} options={names.map((name) => ({ value: name, label: name }))} onChange={setSubjectName} /><Choice label="Peer definition" value={peerMode} options={[{ value: "population", label: "Similar population (±25%)" }, { value: "county", label: "Same dominant county" }, { value: "all", label: "All municipalities in the dataset" }, { value: "selected", label: "Custom: current comparison" }]} onChange={(value) => setPeerMode(value as PeerMode)} /><Choice label="Peer measure" value={peerKey} options={PEER_METRICS.map((item) => ({ value: item.key, label: item.label }))} onChange={(value) => setPeerKey(value as NumericKey)} /></div>
        <div className="peer-summary">{[
          { label: subject?.municipality ?? subjectName, value: shortValue(peerValue, peerMetric.format), note: peerMetric.label },
          { label: "Peer median", value: shortValue(peerMedian, peerMetric.format), note: `${peers.filter((row) => reported(row[peerKey])).length} reporting peers of ${peers.length} matches` },
          { label: "Difference", value: shortValue(difference, peerMetric.format), note: "Municipality minus peer median" },
          { label: "Relative difference", value: shortValue(percentDifference, "percent"), note: "Not a quality or efficiency score" },
        ].map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small></div>)}</div>
        <Panel title={`${peerMetric.label}: the peer distribution`} description={`FY ${year} · ${peerMode === "population" ? "Population within 75%–125% of the focus municipality." : "The focus municipality is excluded from the peer median."}`} action={<span className="panel-tag">{peers.length} matching peers</span>} footer={<span className="coverage-note"><span className="legend-dot" style={{ background: NC_COLORS.navy }} />{subject?.municipality} <span className="legend-dot" style={{ background: NC_COLORS.peer }} />Peers <span className="median-dash" />Peer median</span>}>
          {subject && <MetricBars rows={[subject, ...peers]} field={peerKey} format={peerMetric.format} colors={colors} median={peerMedian} highlight={subject.municipality} />}
          {!peers.length && <Notice>No peers match this definition. Try a different peer group; a peer median cannot be calculated.</Notice>}
        </Panel>
      </TabsContent>

      <TabsContent value="data" className="view-stack">
        <Panel title={tableAll ? `All ${yearRows.length} municipalities` : "Selected municipalities"} description={`${tableAll ? yearRows.length : rows.length} municipalities in one table · FY ${year}. The fiscal-year filter applies; missing values are labeled Not reported.`} action={<Button variant="outline" onClick={() => setTableAll(!tableAll)}>{tableAll ? "Show comparison only" : `Show all ${names.length}`}</Button>}>
          <FinanceTable rows={tableAll ? yearRows : rows} columns={TABLE_COLUMNS} colors={colors} />
        </Panel>
        <div className="methodology-layout"><Panel title="Traceable to the source" description="The underlying data stays in the existing Supabase table."><div className="source-list"><a href="https://www.ncdor.gov/taxes-forms/property-tax/property-tax-rates" target="_blank" rel="noreferrer"><span className="source-icon"><Landmark className="size-4" /></span><span><strong>NC Department of Revenue</strong><small>Published municipal and effective property-tax rates</small></span><ArrowUpRight className="size-4" /></a><a href="https://www.nctreasurer.gov/divisions/state-and-local-government-finance/lgc/local-fiscal-management/afir" target="_blank" rel="noreferrer"><span className="source-icon"><Layers3 className="size-4" /></span><span><strong>NC Treasurer / Local Government Commission</strong><small>AFIR financial profiles, debt, fund balance, and functions</small></span><ArrowUpRight className="size-4" /></a><a href="https://www.osbm.nc.gov/facts-figures/population-demographics/state-demographer/municipal-population-estimates" target="_blank" rel="noreferrer"><span className="source-icon"><Users className="size-4" /></span><span><strong>NC Office of State Budget and Management</strong><small>Revised municipal population estimates</small></span><ArrowUpRight className="size-4" /></a></div></Panel>
          <Panel title="Read the numbers with context" description="Methodology and important limitations."><Accordion defaultValue={["missing"]}>
            <AccordionItem value="missing"><AccordionTrigger>Missing is not zero</AccordionTrigger><AccordionContent>Boone and Elizabeth City lack usable financial-profile totals in all three years; other rows also have gaps. Missing values are excluded from charts and medians. Public Works and Administration are not safely mapped separately and remain null.</AccordionContent></AccordionItem>
            <AccordionItem value="years"><AccordionTrigger>Fiscal years and per-resident values</AccordionTrigger><AccordionContent>FY 2024 means the year ending June 30, 2024. Population uses the revised July 1, 2023 estimate, following the LGC convention. Per-resident values divide the reported amount by population. The dataset includes FY {Math.min(...years)}–{Math.max(...years)}, not a live current-year budget.</AccordionContent></AccordionItem>
            <AccordionItem value="functions"><AccordionTrigger>Functions and composition</AccordionTrigger><AccordionContent>Composition uses six broad AFIR functions: Public Safety, Transportation, General Government, Debt Service, Utilities, and Other. Detailed police, fire, parks, planning, sanitation, and cultural functions can overlap these broad totals and are never added to them. Category shares divide by reported total expenditures.</AccordionContent></AccordionItem>
            <AccordionItem value="compare"><AccordionTrigger>What comparisons cannot tell you</AccordionTrigger><AccordionContent>Municipalities offer different combinations of services. Utility operations, commuters, visitors, geography, and capital projects affect spending. Higher spending does not automatically imply poor management; lower taxes do not automatically imply better government. There is no overall best-city score.</AccordionContent></AccordionItem>
          </Accordion></Panel></div>
      </TabsContent>
      <footer className="explorer-footer"><span><Check className="size-3.5" /> {data.length} source records · {names.length} municipalities · {years.length} fiscal years</span><span>Comparable measures. Important differences.</span></footer>
    </main>
  </Tabs>
}
