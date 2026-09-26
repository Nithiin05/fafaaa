"use client";
/**
 * Chart components. Colours validated for the dark surface (#0B1324) with the dataviz validator:
 * primary series #3F8FEA, secondary #C7851C. Sequential ramp (one hue, light = more) for heatmaps.
 * Specs: 2px lines, ≥8px ringed markers, bars ≤24px with 4px rounded data ends, hairline solid grid.
 */
import { useState, type ReactNode } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine,
} from "recharts";
import { Table2, BarChart3 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";

export const SERIES = { primary: "#3F8FEA", secondary: "#C7851C" };
const SURFACE = "#0B1324";
const GRID = "#1F2C47";
const AXIS = { fill: "#93A0BA", fontSize: 11 };
export const RAMP = ["#16305A", "#1E4A86", "#2A67B5", "#3F8FEA", "#7DB4F5"];

function TooltipBox({ active, payload, label, fmt }: { active?: boolean; payload?: { value: number; payload: Record<string, unknown> }[]; label?: string; fmt?: (v: number, row: Record<string, unknown>) => ReactNode }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-xs shadow-card">
      <div className="text-fg-muted">{String(row.tip ?? label ?? "")}</div>
      <div className="mt-0.5 font-semibold text-fg tabular">{fmt ? fmt(payload[0].value, row) : payload[0].value}</div>
    </div>
  );
}

/** A chart card with a chart/table toggle so every chart has a table view. */
export function ChartCard({ title, subtitle, table, children, className }:
  { title: string; subtitle?: string; table: { head: string[]; rows: (string | number)[][] }; children: ReactNode; className?: string }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle}
        action={
          <button onClick={() => setAsTable(!asTable)} className="rounded-md p-1.5 text-fg-subtle hover:bg-ink-800 hover:text-fg"
            aria-label={asTable ? "Show chart" : "Show table"} title={asTable ? "Show chart" : "Show table"}>
            {asTable ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
          </button>
        } />
      <div className="px-3 pb-4 pt-3 sm:px-4">
        {asTable ? (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-ink-900 text-left text-fg-muted">
                <tr>{table.head.map((h) => <th key={h} className="px-2 py-1.5 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="tabular">
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-t border-ink-700">{r.map((c, j) => <td key={j} className="px-2 py-1.5">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : children}
      </div>
    </Card>
  );
}

/** Single-series line over time (score, accuracy). */
export function TrendLine({ data, xKey, yKey, yMax, fmt, height = 220, refY }:
  { data: Record<string, unknown>[]; xKey: string; yKey: string; yMax?: number; fmt?: (v: number) => string; height?: number; refY?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={16} />
        <YAxis domain={[0, yMax ?? "auto"]} tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
        {refY !== undefined && <ReferenceLine y={refY} stroke="#6B7894" strokeDasharray="0" strokeWidth={1} />}
        <Tooltip content={<TooltipBox fmt={fmt ? (v) => fmt(v) : undefined} />} cursor={{ stroke: "#6B7894", strokeWidth: 1 }} />
        <Line type="monotone" dataKey={yKey} stroke={SERIES.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          dot={{ r: 4, fill: SERIES.primary, stroke: SURFACE, strokeWidth: 2 }}
          activeDot={{ r: 6, fill: SERIES.primary, stroke: SURFACE, strokeWidth: 2 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Single-series columns (questions per day, mock scores). */
export function Columns({ data, xKey, yKey, fmt, height = 220, yMax }:
  { data: Record<string, unknown>[]; xKey: string; yKey: string; fmt?: (v: number) => string; height?: number; yMax?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -12 }} barCategoryGap="30%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={12} />
        <YAxis domain={[0, yMax ?? "auto"]} tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
        <Tooltip content={<TooltipBox fmt={fmt ? (v) => fmt(v) : undefined} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey={yKey} fill={SERIES.primary} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars with the value at the tip (subject accuracy, time per question). */
export function HBars({ data, labelKey, valueKey, max = 100, fmt = (v) => `${v}%` }:
  { data: Record<string, unknown>[]; labelKey: string; valueKey: string; max?: number; fmt?: (v: number) => string }) {
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const v = d[valueKey] as number | null;
        return (
          <div key={i} className="group grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 text-xs" title={`${d[labelKey]}: ${v === null ? "no attempts" : fmt(v)}`}>
            <span className="truncate text-fg-muted">{String(d[labelKey])}</span>
            <div className="h-3 rounded-r bg-ink-800">
              {v !== null && <div className="h-3 rounded-r transition-[width] duration-700 group-hover:brightness-110" style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: SERIES.primary, borderTopRightRadius: 4, borderBottomRightRadius: 4 }} />}
            </div>
            <span className="text-right tabular text-fg">{v === null ? "—" : fmt(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Accuracy heatmap: one cell per attempted topic, grouped by subject. */
export function TopicHeatmap({ topics }: { topics: { topic_id: number; name: string; subject: string; accuracy: number | null; attempted: number }[] }) {
  const bySubject = topics.reduce<Record<string, typeof topics>>((acc, t) => { (acc[t.subject] ??= []).push(t); return acc; }, {});
  const step = (a: number) => RAMP[Math.min(4, Math.floor(a / 20))];
  return (
    <div>
      <div className="space-y-3">
        {Object.entries(bySubject).map(([subject, list]) => (
          <div key={subject} className="grid grid-cols-[6.5rem_1fr] items-start gap-3">
            <span className="pt-1 text-xs text-fg-muted">{subject}</span>
            <div className="flex flex-wrap gap-[2px]">
              {list.map((t) => (
                <div key={t.topic_id} className="group relative">
                  <div className="h-6 w-6 rounded-[4px] ring-1 ring-transparent transition hover:ring-fg-muted" style={{ background: step(t.accuracy ?? 0) }} tabIndex={0}
                    aria-label={`${t.name}: ${t.accuracy}% accuracy over ${t.attempted} questions`} />
                  <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 hidden w-44 -translate-x-1/2 rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-xs shadow-card group-hover:block group-focus-within:block">
                    <div className="text-fg">{t.name}</div>
                    <div className="mt-0.5 text-fg-muted tabular">{t.accuracy}% · {t.attempted} answered</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-fg-muted">
        <span>0%</span>
        {RAMP.map((c) => <span key={c} className="h-2.5 w-6 rounded-sm" style={{ background: c }} />)}
        <span>100% accuracy</span>
      </div>
    </div>
  );
}

