"use client"

import { useId, useState, type CSSProperties, type ReactNode } from "react"
import { Check, ChevronDown, Info, Search, X } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatValue, type FinanceRow, type MetricOption, type NumericKey } from "@/lib/finance"

export function Choice({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void
}) {
  const id = useId()
  return <div className="explorer-choice">
    <Label htmlFor={id}>{label}</Label>
    <Select value={value} onValueChange={(next) => { if (next) onChange(next) }}>
      <SelectTrigger id={id} aria-label={label} className="w-full bg-white text-slate-800 data-[size=default]:h-9">
        <SelectValue>{options.find((option) => option.value === value)?.label ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="min-w-56">
        {options.map((option) => <SelectItem key={option.value} value={option.value} className="py-2">{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
}

export function CityPicker({ names, selected, onChange, colors }: {
  names: string[]; selected: string[]; onChange: (value: string[]) => void; colors: Record<string, string>
}) {
  const [search, setSearch] = useState("")
  const matches = names.filter((name) => name.toLowerCase().includes(search.trim().toLowerCase()))
  return <div className="city-picker">
    <div className="city-chips" aria-label="Selected municipalities">
      {selected.map((name) => <span className="city-chip" key={name} style={{ "--city-color": colors[name] } as CSSProperties}>
        <i style={{ backgroundColor: colors[name] }} />{name}
        <Button variant="ghost" size="icon-xs" aria-label={`Remove ${name}`} disabled={selected.length === 1} onClick={() => onChange(selected.filter((item) => item !== name))}><X className="size-3" /></Button>
      </span>)}
    </div>
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className="h-9 bg-white text-xs" />}>
        Edit comparison <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-2">
        <div className="relative mb-2"><Search className="absolute top-2.5 left-2.5 size-4 text-slate-400" /><Input aria-label="Search municipalities" placeholder="Find a municipality…" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (!["Escape", "Tab"].includes(event.key)) event.stopPropagation() }} className="h-9 pl-8" /></div>
        <div className="max-h-64 overflow-y-auto">
          {matches.map((name) => <DropdownMenuCheckboxItem key={name} closeOnClick={false} checked={selected.includes(name)} disabled={selected.length === 1 && selected.includes(name)} onCheckedChange={(checked) => onChange(checked ? [...selected, name] : selected.filter((item) => item !== name))} className="py-2">{name}</DropdownMenuCheckboxItem>)}
          {!matches.length && <p className="p-3 text-xs text-slate-500">No municipalities match this search.</p>}
        </div>
        <p className="mt-2 border-t px-2 pt-2 text-[11px] text-slate-500">{selected.length} selected · Start with 2–6 for a focused comparison.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
}

export function Panel({ title, description, action, children, footer, className = "", id }: {
  title: string; description?: string; action?: ReactNode; children: ReactNode; footer?: ReactNode; className?: string; id?: string
}) {
  return <Card id={id} className={`explorer-panel ${className}`}>
    <CardHeader className="explorer-panel-header">
      <div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}
    </CardHeader>
    <CardContent className="explorer-panel-content">{children}</CardContent>
    {footer && <div className="explorer-panel-footer">{footer}</div>}
  </Card>
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="explorer-notice"><Info className="size-4 shrink-0" /><div>{children}</div></div>
}

export function EmptyChart({ message = "No reported values for this selection." }: { message?: string }) {
  return <div className="empty-chart"><div className="empty-chart-icon"><Info className="size-5" /></div><h3>Data not available</h3><p>{message}</p></div>
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return <div className="chart-legend">{items.map((item) => <span key={item.name}><i style={{ backgroundColor: item.color }} />{item.name}</span>)}</div>
}

export function MissingNote({ rows, field }: { rows: FinanceRow[]; field: NumericKey }) {
  const missing = rows.filter((row) => row[field] === null)
  return missing.length
    ? <span className="coverage-note"><Info className="size-3.5" /> Not reported: {missing.map((row) => row.municipality).join(", ")}. Missing values are excluded, not zero.</span>
    : <span className="coverage-note"><Check className="size-3.5" /> Reported for all {rows.length} selected municipalities.</span>
}

export type Column = { label: string; key: NumericKey; format: MetricOption["format"] }
export function FinanceTable({ rows, columns, colors }: { rows: FinanceRow[]; columns: Column[]; colors?: Record<string, string> }) {
  return <div className="finance-table"><Table><TableHeader><TableRow><TableHead>Municipality</TableHead>{columns.map((column) => <TableHead key={column.key} className="text-right">{column.label}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={`${row.municipality}-${row.fiscal_year}`}><TableCell className="font-semibold"><span className="table-city">{colors?.[row.municipality] && <i style={{ backgroundColor: colors[row.municipality] }} />}{row.municipality}</span></TableCell>{columns.map((column) => <TableCell key={column.key} className={`text-right tabular-nums ${row[column.key] === null ? "text-slate-400" : ""}`}>{formatValue(row[column.key], column.format)}</TableCell>)}</TableRow>)}</TableBody></Table></div>
}
