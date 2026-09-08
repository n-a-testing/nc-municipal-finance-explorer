"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowDownUp,
  ArrowUpRight,
  Search,
  Plus,
  ArrowRight,
  X,
  Command as CommandIcon,
  Building2,
  ChartNoAxesCombined,
  Layers3,
  Wallet,
  Table2,
  BookOpen,
  Users,
  RotateCcw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Choice } from "./explorer-controls";
import {
  MetricBars,
  HistoryChart,
  BalanceChart,
  CompositionChart,
  Sparkline,
} from "./explorer-charts";
import {
  type FinanceRow,
  type NumericKey,
  type MetricOption,
  OVERVIEW_METRICS,
  TREND_METRICS,
  PEER_METRICS,
  PROFILE_FIELDS,
  CATEGORIES,
  categoryKeys,
  formatValue,
} from "@/lib/finance";
import {
  reported,
  shortValue,
  medianValue,
  estimateTax,
  peersFor,
  type PeerMode,
} from "@/lib/explorer";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";

const palette = [
  "#4263eb",
  "#c33b50",
  "#ba831b",
  "#138b8d",
  "#7854ba",
  "#467cad",
  "#ba6946",
  "#68788e",
];
const views = [
  { id: "compare", label: "Compare", icon: ChartNoAxesCombined },
  { id: "spending", label: "Spending", icon: Layers3 },
  { id: "taxes", label: "Tax calculator", icon: Wallet },
  { id: "trends", label: "Trends", icon: ArrowUpRight },
  { id: "profile", label: "Profiles", icon: Building2 },
  { id: "directory", label: "All places", icon: Table2 },
  { id: "about", label: "Sources", icon: BookOpen },
];
const intros: Record<string, [string, string]> = {
  compare: [
    "Municipality comparison",
    "Compare taxes, revenue, and spending across selected municipalities.",
  ],
  spending: [
    "Municipal spending",
    "Revenue, expenditures, and spending by service.",
  ],
  taxes: [
    "Property taxes",
    "Compare municipal rates and estimate the annual tax on an assessed property value.",
  ],
  trends: [
    "Financial trends",
    "Follow each municipality across the available fiscal years. Gaps indicate unreported values.",
  ],
  profile: [
    "Municipality profile",
    "Explore a municipality’s finances and compare it with a relevant peer group.",
  ],
  directory: [
    "Municipality directory",
    "Search all 50 communities, sort the numbers, and open a detailed profile.",
  ],
  about: [
    "Sources & methodology",
    "Official sources, consistent calculations, and the limits of comparing local governments.",
  ],
};
function Panel({
  title,
  note,
  children,
  action,
  className = "",
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`nw-panel ${className}`}>
      <CardHeader className="nw-panel-head">
        <div>
          <h2>{title}</h2>
          {note && <p>{note}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="nw-panel-body">{children}</CardContent>
    </Card>
  );
}
function DataTable({
  rows,
  columns,
  open,
}: {
  rows: FinanceRow[];
  columns: MetricOption[];
  open: (name: string) => void;
}) {
  const [sort, setSort] = useState<{
    key: NumericKey | "municipality";
    desc: boolean;
  }>({ key: "municipality", desc: false });
  const sorted = [...rows].sort((a, b) => {
    const av = a[sort.key],
      bv = b[sort.key];
    if (av === null) return bv === null ? 0 : 1;
    if (bv === null) return -1;
    const result =
      typeof av === "string"
        ? av.localeCompare(String(bv))
        : Number(av) - Number(bv);
    return sort.desc ? -result : result;
  });
  function order(key: NumericKey | "municipality") {
    setSort({ key, desc: sort.key === key ? !sort.desc : true });
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Button variant="ghost" onClick={() => order("municipality")}>
              Municipality <ArrowDownUp />
            </Button>
          </TableHead>
          {columns.map((c) => (
            <TableHead
              key={c.key}
              aria-sort={
                sort.key === c.key
                  ? sort.desc
                    ? "descending"
                    : "ascending"
                  : "none"
              }
            >
              <Button variant="ghost" onClick={() => order(c.key)}>
                {c.label}
                <ArrowDownUp />
              </Button>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.municipality}>
            <TableCell>
              <Button
                className="nw-city-link"
                variant="link"
                onClick={() => open(r.municipality)}
              >
                {r.municipality}
                <ArrowUpRight />
              </Button>
              <small>{r.county ?? "County not reported"}</small>
            </TableCell>
            {columns.map((c) => (
              <TableCell
                key={c.key}
                className={!reported(r[c.key]) ? "nw-missing" : "nw-number"}
              >
                {formatValue(r[c.key], c.format)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
export function MunicipalWorkspace({ data }: { data: FinanceRow[] }) {
  const years = [...new Set(data.map((r) => r.fiscal_year))].sort(
    (a, b) => b - a,
  );
  const names = [...new Set(data.map((r) => r.municipality))].sort();
  const [view, setView] = useState("compare");
  const [year, setYear] = useState(years[0]);
  const [selected, setSelected] = useState(
    ["Charlotte", "Raleigh", "Wilson", "Apex"].filter((n) => names.includes(n)),
  );
  const [metricKey, setMetricKey] = useState<NumericKey>("spending_per_capita");
  const [searchOpen, setSearchOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [filter, setFilter] = useState("");
  const [focus, setFocus] = useState(
    names.includes("Apex") ? "Apex" : names[0],
  );
  const [peerMode, setPeerMode] = useState<PeerMode>("population");
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number][1]>("public_safety");
  const [perResident, setPerResident] = useState(true);
  const [assessed, setAssessed] = useState("400000");
  const [taxScope, setTaxScope] = useState("combined");
  const colors = Object.fromEntries(
    names.map((n, i) => [n, palette[i % palette.length]]),
  );
  selected.forEach((n, i) => {
    colors[n] = palette[i % palette.length];
  });
  const current = data.filter((r) => r.fiscal_year === year);
  const rows = selected.flatMap((n) =>
    current.filter((r) => r.municipality === n),
  );
  const rateFor = (row: FinanceRow) =>
    taxScope === "county"
      ? row.county_property_tax_rate
      : taxScope === "municipal"
        ? row.property_tax_rate
        : reported(row.property_tax_rate) &&
            reported(row.county_property_tax_rate)
          ? row.property_tax_rate + row.county_property_tax_rate
          : null;
  const taxRows = rows.map((row) => ({
    ...row,
    property_tax_rate: rateFor(row),
  }));
  const taxLabel =
    taxScope === "combined"
      ? "Municipal + county"
      : taxScope === "county"
        ? "County only"
        : "Municipal only";
  const allMetrics = [...OVERVIEW_METRICS, ...TREND_METRICS];
  const metric =
    allMetrics.find((m) => m.key === metricKey) ?? OVERVIEW_METRICS[0];
  const median = medianValue(rows.map((r) => r[metricKey]));
  const subject = current.find((r) => r.municipality === focus);
  const peers = subject ? peersFor(current, subject, peerMode, selected) : [];
  const cat = categoryKeys(category);
  const openProfile = (name: string) => {
    setFocus(name);
    setView("profile");
    setSearchOpen(false);
  };
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPicker(false);
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);
  const columns = [
    OVERVIEW_METRICS[4],
    OVERVIEW_METRICS[2],
    OVERVIEW_METRICS[0],
    OVERVIEW_METRICS[1],
    OVERVIEW_METRICS[7],
  ];
  const missing = rows.filter((r) => !reported(r[metricKey]));
  const toggle = (name: string) =>
    setSelected((s) =>
      s.includes(name)
        ? s.length > 1
          ? s.filter((n) => n !== name)
          : s
        : [...s, name],
    );
  return (
    <div className="nw-app">
      <a href="#workspace" className="skip-link">
        Skip to analysis
      </a>
      <header className="nw-header">
        <div className="nw-top">
          <Button
            variant="ghost"
            className="nw-brand"
            onClick={() => setView("compare")}
          >
            <Image src="/nc-mark.svg" width={44} height={44} alt="" className="nw-brand-mark" />
            <span className="nw-wordmark">NC Municipal <span>Finance Explorer</span></span>
          </Button>
          <Button
            variant="outline"
            className="nw-search"
            onClick={() => {
              setPicker(false);
              setSearchOpen(true);
            }}
          >
            <Search />
            <span>Search places, counties, or tools</span><kbd>⌘ K</kbd>
          </Button>
          <Button
            variant="ghost"
            className="nw-directory"
            onClick={() => setView("directory")}
          >
            {names.length} municipalities
            <ArrowUpRight />
          </Button>
        </div>
        <div className="nw-nav">
          <nav className="nw-primary-nav" aria-label="Main navigation">
            {views.map((v) => (
              <Button
                variant="ghost"
                key={v.id}
                onClick={() => setView(v.id)}
                aria-current={
                  view === v.id
                    ? "page"
                    : undefined
                }
              >
                <v.icon />
                {v.label}
              </Button>
            ))}
          </nav>
          <span className="nw-years">
            {Math.min(...years)} — {Math.max(...years)}
          </span>
        </div>
      </header>
      <main id="workspace" className="nw-main">
        <section className="nw-intro">
          <div>
            <span className="nw-eyebrow">
              NORTH CAROLINA / MUNICIPAL FINANCE
            </span>
            <h1>{intros[view][0]}</h1>
            <p>{intros[view][1]}</p>
          </div>
          <Choice
            label="Fiscal year ending"
            value={String(year)}
            options={years.map((y) => ({
              value: String(y),
              label: `June ${y}`,
            }))}
            onChange={(v) => setYear(Number(v))}
          />
        </section>
        {!["about", "directory", "profile"].includes(view) && (
          <section className="nw-tray" aria-label="Comparison selection">
            <span className="nw-tray-label">
              <Users />
              Compare
            </span>
            <div className="nw-chips">
              {selected.map((n) => (
                <span key={n}>
                  <i style={{ background: colors[n] }} />
                  {n}
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Remove ${n}`}
                    disabled={selected.length === 1}
                    onClick={() => toggle(n)}
                  >
                    <X />
                  </Button>
                </span>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setPicker(true);
                setSearchOpen(true);
              }}
            >
              <Plus />
              Add places
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Reset comparison"
              onClick={() =>
                setSelected(
                  ["Charlotte", "Raleigh", "Wilson", "Apex"].filter((n) =>
                    names.includes(n),
                  ),
                )
              }
            >
              <RotateCcw />
            </Button>
          </section>
        )}
        <section
          hidden={view !== "compare"}
          aria-label="compare"
          className="nw-stack"
        >
          <div className="nw-snapshots">
            {rows.map((r) => (
              <Card key={r.municipality} className="nw-snapshot" style={{ background: `linear-gradient(145deg, white 30%, ${colors[r.municipality]}0d)` }}>
                <div className="nw-snapshot-title">
                  <Button
                    variant="link"
                    onClick={() => openProfile(r.municipality)}
                  >
                    <i style={{ background: colors[r.municipality] }} />
                    {r.municipality}
                    <ArrowUpRight />
                  </Button>
                  <span>{shortValue(r.population, "count")} residents</span>
                </div>
                <div className="nw-snapshot-value">
                  <div>
                    <strong>{shortValue(r.spending_per_capita)}</strong>
                    <p>spending / resident</p>
                  </div>
                </div>
                <div className="nw-snapshot-history">
                  <span>Annual trend<br />{Math.min(...years)}–{Math.max(...years)}</span>
                  <Sparkline
                    values={[...years]
                      .reverse()
                      .map(
                        (y) =>
                          data.find(
                            (d) =>
                              d.municipality === r.municipality &&
                              d.fiscal_year === y,
                          )?.spending_per_capita ?? null,
                      )}
                    color={colors[r.municipality]}
                  />
                </div>
                <div className="nw-snapshot-bottom">
                  <span>Tax / $100</span>
                  <b>{shortValue(r.property_tax_rate, "rate")}</b>
                </div>
              </Card>
            ))}
          </div>
          <div className="nw-section">
            <div>
              <h2>Compare municipalities</h2>
              <p>Reported values for the selected fiscal year.</p>
            </div>
            <Choice
              label="Measure"
              value={metricKey}
              options={OVERVIEW_METRICS.map((m) => ({
                value: m.key,
                label: m.label,
              }))}
              onChange={(v) => setMetricKey(v as NumericKey)}
            />
          </div>
          <section className="nw-benchmark" aria-label="Comparison context">
            <div>
              <span>Selected-place median</span>
              <strong>{shortValue(median, metric.format)}</strong>
            </div>
            <div>
              <span>All {names.length} places · median</span>
              <strong>
                {shortValue(
                  medianValue(current.map((r) => r[metricKey])),
                  metric.format,
                )}
              </strong>
            </div>
            <div>
              <span>Selected places reporting</span>
              <strong>
                {rows.length - missing.length} of {rows.length}
              </strong>
            </div>
          </section>
          <div className="nw-chart-grid">
            <Panel
              title={metric.label}
              note={`FY ${year} · selected municipalities`}
              action={
                <span className="nw-pill">
                  Median {shortValue(median, metric.format)}
                </span>
              }
            >
              <MetricBars
                rows={rows}
                field={metricKey}
                format={metric.format}
                colors={colors}
                median={median}
              />
              <p className="nw-note">
                Dashed line: selected-place median.{" "}
                {missing.length
                  ? `Not reported: ${missing.map((r) => r.municipality).join(", ")}.`
                  : "All selected places report this measure."}
              </p>
            </Panel>
            <Panel
              title="Historical comparison"
              note={`${metric.label} · all available years`}
            >
              <HistoryChart
                data={data}
                names={selected}
                years={years}
                field={metricKey}
                format={metric.format}
                colors={colors}
                compact
              />
            </Panel>
          </div>
          <Panel
            title="How the numbers compare"
            note="Click a column to sort. Open a municipality for its full profile."
          >
            <DataTable rows={rows} columns={columns} open={openProfile} />
          </Panel>
        </section>
        <section
          hidden={view !== "spending"}
          aria-label="spending"
          className="nw-stack"
        >
          <div className="nw-section">
            <h2>Budget at a glance</h2>
            <Button variant="outline" onClick={() => setPerResident((v) => !v)}>
              <ArrowDownUp />
              {perResident ? "Per resident" : "Total dollars"}
            </Button>
          </div>
          <Panel
            title="Revenue & expenditures"
            note={
              perResident
                ? "Dollars per resident · reported totals divided by population"
                : "Total reported dollars"
            }
          >
            <BalanceChart rows={rows} perCapita={perResident} />
          </Panel>
          <div className="nw-chart-grid">
            <Panel
              title="Where the money goes"
              note="Comparable broad functions as a share of reported spending"
            >
              <CompositionChart rows={rows} />
            </Panel>
            <Panel
              title="Explore a service"
              action={
                <Choice
                  label="Expenditure category"
                  value={category}
                  options={CATEGORIES.map(([label, value]) => ({
                    label,
                    value,
                  }))}
                  onChange={(v) => setCategory(v as typeof category)}
                />
              }
            >
              <MetricBars
                rows={rows}
                field={perResident ? cat.perCapita : cat.expenditure}
                format="money"
                colors={colors}
              />
              <p className="nw-note">
                {perResident ? "Dollars per resident." : "Total dollars."} A
                missing category is not zero.
              </p>
            </Panel>
          </div>
          <Panel
            title="Service detail"
            note="Official categories may combine functions differently."
          >
            <DataTable
              rows={rows}
              open={openProfile}
              columns={[
                {
                  key: cat.expenditure,
                  label: "Total spending",
                  format: "money",
                },
                { key: cat.perCapita, label: "Per resident", format: "money" },
                {
                  key: cat.percent,
                  label: "Share of expenditures",
                  format: "percent",
                },
              ]}
            />
          </Panel>
        </section>
        <section
          hidden={view !== "taxes"}
          aria-label="taxes"
          className="nw-stack"
        >
          <section className="nw-tax-controls">
            <div>
              <h2>Estimate annual property tax</h2>
              <p>
                Choose which taxes to include, then enter an assessed property
                value.
              </p>
            </div>
            <Choice
              label="Include in estimate"
              value={taxScope}
              options={[
                { value: "combined", label: "Municipal + county" },
                { value: "municipal", label: "Municipal only" },
                { value: "county", label: "County only" },
              ]}
              onChange={setTaxScope}
            />
          </section>
          <div className="nw-chart-grid">
            <Panel
              title={`${taxLabel} rates`}
              note="Dollars per $100 of assessed value · selected fiscal year"
            >
              <MetricBars
                rows={taxRows}
                field="property_tax_rate"
                format="rate"
                colors={colors}
              />
            </Panel>
            <Panel
              title="Property tax calculator"
              note={`Estimated annual property tax · ${taxLabel.toLowerCase()}`}
              className="nw-calculator"
            >
              <label htmlFor="assessed">Assessed property value</label>
              <div className="nw-amount">
                <span>$</span>
                <Input
                  id="assessed"
                  type="number"
                  min="0"
                  step="10000"
                  value={assessed}
                  onChange={(e) => setAssessed(e.target.value)}
                />
              </div>
              <div className="nw-estimates">
                {rows.map((r) => (
                  <div key={r.municipality}>
                    <span>
                      <i style={{ background: colors[r.municipality] }} />
                      {r.municipality}
                    </span>
                    <strong>
                      {formatValue(
                        assessed.trim()
                          ? estimateTax(Number(assessed), rateFor(r))
                          : null,
                        "money",
                      )}
                    </strong>
                  </div>
                ))}
              </div>
              <p className="nw-note">
                Assessed value × selected rate ÷ 100. Excludes special district
                taxes, fees, exemptions, and other assessments.
                {taxScope === "municipal" && " County tax is excluded."}
                {taxScope === "county" && " Municipal tax is excluded."}
                {taxScope !== "municipal" &&
                  " County rates use the dataset’s dominant county. For municipalities crossing county lines, your property's county may differ."}
                {taxScope === "combined" &&
                  " Both rates must be reported for a combined estimate."}
              </p>
            </Panel>
          </div>
          <Panel
            title="Tax breakdown"
            note="Check the municipal and county portions separately. Unreported rates are never treated as zero."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Municipality / county</TableHead>
                  <TableHead>Municipal rate / $100</TableHead>
                  <TableHead>County rate / $100</TableHead>
                  <TableHead>{taxLabel} rate / $100</TableHead>
                  <TableHead>Annual estimate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.municipality}>
                    <TableCell>
                      {row.municipality}
                      <small>{row.county ?? "County not reported"}</small>
                    </TableCell>
                    <TableCell>
                      {formatValue(row.property_tax_rate, "rate")}
                    </TableCell>
                    <TableCell>
                      {formatValue(row.county_property_tax_rate, "rate")}
                    </TableCell>
                    <TableCell>{formatValue(rateFor(row), "rate")}</TableCell>
                    <TableCell>
                      {formatValue(
                        assessed.trim()
                          ? estimateTax(Number(assessed), rateFor(row))
                          : null,
                        "money",
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
          <Panel
            title="Tax base & collections"
            note="Published rates and effective rates measure different things."
          >
            <DataTable
              rows={rows}
              open={openProfile}
              columns={[
                OVERVIEW_METRICS[2],
                OVERVIEW_METRICS[3],
                {
                  key: "assessed_valuation",
                  label: "Assessed valuation",
                  format: "money",
                },
                {
                  key: "property_tax_levy",
                  label: "Property tax levy",
                  format: "money",
                },
              ]}
            />
          </Panel>
        </section>
        <section
          hidden={view !== "trends"}
          aria-label="trends"
          className="nw-stack"
        >
          <Panel
            title="Financial trajectory"
            note="Exact reported values · lines break at missing years"
            action={
              <Choice
                label="Historical measure"
                value={metricKey}
                options={allMetrics
                  .filter(
                    (m, i, a) => a.findIndex((x) => x.key === m.key) === i,
                  )
                  .map((m) => ({ value: m.key, label: m.label }))}
                onChange={(v) => setMetricKey(v as NumericKey)}
              />
            }
          >
            <HistoryChart
              data={data}
              names={selected}
              years={years}
              field={metricKey}
              format={metric.format}
              colors={colors}
            />
          </Panel>
          <Panel title="Year by year" note={metric.label}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Municipality</TableHead>
                  {[...years].reverse().map((y) => (
                    <TableHead key={y}>FY {y}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.map((n) => (
                  <TableRow key={n}>
                    <TableCell>{n}</TableCell>
                    {[...years].reverse().map((y) => (
                      <TableCell key={y}>
                        {formatValue(
                          data.find(
                            (r) => r.municipality === n && r.fiscal_year === y,
                          )?.[metricKey],
                          metric.format,
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </section>
        <section
          hidden={view !== "profile"}
          aria-label="profile"
          className="nw-stack"
        >
          <div className="nw-section">
            <div>
              <h2>{focus}, NC</h2>
              <p>
                {subject?.county ?? "County not reported"} · FY {year}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  if (!selected.includes(focus))
                    setSelected([...selected, focus]);
                  setView("compare");
                }}
              >
                <Plus />
                Compare {focus}
              </Button>
            </div>
            <Choice
              label="Municipality"
              value={focus}
              options={names.map((n) => ({ value: n, label: n }))}
              onChange={setFocus}
            />
          </div>
          {subject ? (
            <>
              <div className="nw-profile-grid">
                {PROFILE_FIELDS.slice(0, 11).map(([label, key, fmt]) => (
                  <Card key={key} className="nw-stat">
                    <span>{label}</span>
                    <strong>{shortValue(subject[key], fmt)}</strong>
                    {fmt === "rate" && <small>per $100 assessed value</small>}
                  </Card>
                ))}
              </div>
              <Panel
                title="Compare with peers"
                note={`${peers.length} peers · focus municipality excluded from medians`}
                action={
                  <Choice
                    label="Peer group"
                    value={peerMode}
                    options={[
                      {
                        value: "population",
                        label: "Similar population (±25%)",
                      },
                      { value: "county", label: "Same dominant county" },
                      { value: "all", label: "All municipalities" },
                      { value: "selected", label: "Your selected places" },
                    ]}
                    onChange={(v) => setPeerMode(v as PeerMode)}
                  />
                }
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Measure</TableHead>
                      <TableHead>{focus}</TableHead>
                      <TableHead>Peer median</TableHead>
                      <TableHead>Difference</TableHead>
                      <TableHead>Difference %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PEER_METRICS.map((m) => {
                      const med = medianValue(peers.map((p) => p[m.key]));
                      const value = subject[m.key];
                      const delta =
                        reported(value) && reported(med) ? value - med : null;
                      return (
                        <TableRow key={m.key}>
                          <TableCell>{m.label}</TableCell>
                          <TableCell>{formatValue(value, m.format)}</TableCell>
                          <TableCell>{formatValue(med, m.format)}</TableCell>
                          <TableCell>{formatValue(delta, m.format)}</TableCell>
                          <TableCell>
                            {formatValue(
                              reported(delta) && reported(med) && med !== 0
                                ? (delta / med) * 100
                                : null,
                              "percent",
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <p className="nw-note">
                  {!peers.length &&
                    "No municipalities match this peer group in the dataset. Choose all municipalities or another group. "}
                  Higher spending and lower taxes are not measures of government
                  quality. Service responsibilities differ.
                </p>
              </Panel>
              <Panel title={`${focus} over time`} note="Spending per resident">
                <HistoryChart
                  data={data}
                  names={[focus]}
                  years={years}
                  field="spending_per_capita"
                  format="money"
                  colors={colors}
                />
              </Panel>
            </>
          ) : (
            <p>No record is available for this municipality and fiscal year.</p>
          )}
        </section>
        <section
          hidden={view !== "directory"}
          aria-label="directory"
          className="nw-stack"
        >
          <div className="nw-directory-intro">
            <Input
              aria-label="Filter municipality directory"
              placeholder="Search by municipality or county…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <span>
              {
                current.filter((r) =>
                  `${r.municipality} ${r.county}`
                    .toLowerCase()
                    .includes(filter.toLowerCase()),
                ).length
              }{" "}
              municipalities · FY {year}
            </span>
          </div>
          <Panel
            title="Population & spending"
            note="Population versus spending per resident · hover for exact values"
          >
            <ChartContainer config={{}} className="h-80 w-full aspect-auto">
              <ScatterChart
                margin={{ top: 15, right: 25, bottom: 20, left: 15 }}
              >
                <CartesianGrid strokeDasharray="3 4" stroke="#e7ecf4" />
                <XAxis
                  type="number"
                  dataKey="population"
                  name="Population"
                  tickFormatter={(v) => shortValue(v, "count")}
                  label={{ value: "Population", position: "bottom", offset: 0 }}
                />
                <YAxis
                  type="number"
                  dataKey="spending_per_capita"
                  name="Spending / resident"
                  tickFormatter={(v) => shortValue(v)}
                  width={75}
                />
                <ChartTooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="data-tooltip">
                        <strong>{payload[0].payload.municipality}</strong>
                        <p>
                          {formatValue(payload[0].payload.population, "count")}{" "}
                          residents
                        </p>
                        <p>
                          {formatValue(
                            payload[0].payload.spending_per_capita,
                            "money",
                          )}{" "}
                          / resident
                        </p>
                      </div>
                    ) : null
                  }
                />
                <ReferenceLine
                  y={
                    medianValue(current.map((r) => r.spending_per_capita)) ??
                    undefined
                  }
                  stroke="#aeb9cb"
                  strokeDasharray="4 4"
                />
                <Scatter
                  data={current.filter(
                    (r) =>
                      reported(r.population) && reported(r.spending_per_capita),
                  )}
                  onClick={(p) => {
                    if (p.payload?.municipality)
                      openProfile(p.payload.municipality);
                  }}
                >
                  {current
                    .filter(
                      (r) =>
                        reported(r.population) &&
                        reported(r.spending_per_capita),
                    )
                    .map((r) => (
                      <Cell
                        key={r.municipality}
                        fill={
                          selected.includes(r.municipality)
                            ? colors[r.municipality]
                            : "#a7b7d8"
                        }
                      />
                    ))}
                </Scatter>
              </ScatterChart>
            </ChartContainer>
            <p className="nw-note">
              Only municipalities reporting both measures appear. Dashed line:
              dataset median spending per resident.
            </p>
          </Panel>
          <Panel
            title="All municipalities"
            note="Sortable records for the selected fiscal year"
          >
            <DataTable
              rows={current.filter((r) =>
                `${r.municipality} ${r.county}`
                  .toLowerCase()
                  .includes(filter.toLowerCase()),
              )}
              columns={columns}
              open={openProfile}
            />
          </Panel>
        </section>
        <section
          hidden={view !== "about"}
          aria-label="about"
          className="nw-stack"
        >
          <div className="nw-chart-grid">
            <Panel title="Official North Carolina sources">
              <div className="nw-sources">
                {[
                  [
                    "NC Department of Revenue",
                    "Tax rates, assessed valuations, and levies",
                    "https://www.ncdor.gov/",
                  ],
                  [
                    "NC Department of State Treasurer / LGC",
                    "Municipal revenues, expenditures, debt, and balances",
                    "https://www.nctreasurer.com/",
                  ],
                  [
                    "NC Office of State Budget and Management",
                    "Municipal population estimates",
                    "https://www.osbm.nc.gov/",
                  ],
                ].map(([title, desc, url]) => (
                  <a key={title} href={url} target="_blank" rel="noreferrer">
                    <div>
                      <h3>{title}</h3>
                      <p>{desc}</p>
                    </div>
                    <ArrowUpRight />
                  </a>
                ))}
              </div>
            </Panel>
            <Panel title="Coverage, not completeness">
              <div className="nw-coverage">
                <strong>
                  {names.length}
                  <span>municipalities</span>
                </strong>
                <strong>
                  {years.length}
                  <span>fiscal years</span>
                </strong>
                <strong>
                  {data.length}
                  <span>records</span>
                </strong>
              </div>
              <p>
                Years included: {[...years].reverse().join(", ")}. This is a
                selected dataset, not every North Carolina municipality. Blank
                values mean not reported or unavailable from the joined sources.
              </p>
            </Panel>
          </div>
          <Panel title="How to read this explorer">
            <div className="nw-method-grid">
              {[
                [
                  "Fiscal years",
                  "The year labels identify fiscal years ending in June. Source records are joined by normalized municipality and fiscal year; population reference dates may differ.",
                ],
                [
                  "Per-resident measures",
                  "Reported financial totals divided by the joined population. These aid size comparisons but do not adjust for commuters, visitors, or service responsibilities.",
                ],
                [
                  "Spending categories",
                  "We preserve official source categories. Combined public safety is not split into police and fire. Cultural recreation is not relabeled as parks. Missing categories remain missing.",
                ],
                [
                  "Composition charts",
                  "Only complete broad categories that reconcile within 2% of total expenditures appear. Overlapping or unreconciled categories do not form a composition chart.",
                ],
                [
                  "Property taxes",
                  "Published rates are dollars per $100 assessed value. Choose municipal, county, or combined tax. County rates use the municipality's dominant county in the dataset; verify the property's actual county. Effective rates reflect a different tax-base measure.",
                ],
                [
                  "Compare thoughtfully",
                  "Municipal accounting practices and services differ. Higher spending does not automatically mean poor management; lower taxes do not automatically mean better government.",
                ],
              ].map(([title, body]) => (
                <div key={title}>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>
        <footer className="nw-footer">
          <span>NC Municipal Finance Explorer</span>
          <span>North Carolina · Municipal data</span>
          <Button variant="link" onClick={() => setView("about")}>
            Sources & methodology <ArrowRight />
          </Button>
        </footer>
      </main>
      <CommandDialog
        className="nw-search-dialog"
        title={picker ? "Choose municipalities" : "Search the explorer"}
        description={
          picker
            ? "Select municipalities to compare, then choose Done."
            : "Find a municipality or open an analysis view."
        }
        open={searchOpen}
        onOpenChange={setSearchOpen}
      >
        <div className="nw-dialog-heading">
          <div>
            <h2>{picker ? "Choose municipalities" : "Search the explorer"}</h2>
            <p>
              {picker
                ? `${selected.length} selected · select a row to add or remove`
                : "Find a place, county, or analysis view"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
          >
            <X />
          </Button>
        </div>
        <CommandInput
          autoFocus
          placeholder={
            picker
              ? "Find a place to compare…"
              : "Search municipalities or views…"
          }
        />
        <CommandList>
          <CommandEmpty>No matching results.</CommandEmpty>
          {!picker && (
            <CommandGroup heading="Go to">
              {views.map((v) => (
                <CommandItem
                  key={v.id}
                  onSelect={() => {
                    setView(v.id);
                    setSearchOpen(false);
                  }}
                >
                  <v.icon />
                  {v.label}
                  <span className="nw-command-action">
                    Open <ArrowRight />
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup
            heading={picker ? "Add or remove municipalities" : "Municipalities"}
          >
            {names.map((n) => (
              <CommandItem
                key={n}
                value={`${n} ${current.find((r) => r.municipality === n)?.county ?? ""}`}
                className="nw-place-result"
                aria-disabled={
                  picker && selected.length === 1 && selected.includes(n)
                }
                onSelect={() => (picker ? toggle(n) : openProfile(n))}
              >
                <Building2 />
                <span className="nw-result-label">
                  <b>{n}</b>
                  <small>
                    {current.find((r) => r.municipality === n)?.county ??
                      "County not reported"}
                  </small>
                </span>
                {picker ? (
                  <span
                    className={`nw-selection-check ${selected.includes(n) ? "is-checked" : ""}`}
                  >
                    {selected.includes(n) && <Check />}
                    <span className="sr-only">
                      {selected.includes(n) ? "Selected" : "Not selected"}
                    </span>
                  </span>
                ) : (
                  <span className="nw-command-action">
                    Profile <ArrowUpRight />
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        <div className="nw-command-footer">
          <CommandIcon />{" "}
          {picker
            ? `${selected.length} places selected`
            : "Navigate with ↑ ↓ · Enter to open"}
          {picker ? (
            <Button onClick={() => setSearchOpen(false)}>
              Done · {selected.length} places
            </Button>
          ) : (
            <span>Esc to close</span>
          )}
        </div>
      </CommandDialog>
    </div>
  );
}
