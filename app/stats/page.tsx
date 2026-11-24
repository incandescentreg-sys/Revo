"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Cell
} from "recharts";
import { useApp } from "@/components/AppProvider";
import { PageHeader, StatCard, SectionTitle } from "@/components/ui";
import { computeStreaks, averageGapDays, eventsInRange } from "@/lib/stats";
import { todayKey, startOfWeekMonday, addDaysSafe } from "@/lib/dates";

export default function StatsPage() {
  const { events } = useApp();
  const now = new Date();

  const weekly = useMemo(() => {
    const monday = startOfWeekMonday(now);
    const days: { label: string; count: number }[] = [];
    const weekStart = addDaysSafe(monday, -6); // show last 7 days ending today
    for (let i = 0; i < 7; i++) {
      const d = addDaysSafe(weekStart, i);
      const key = d.toISOString().slice(0, 10);
      days.push({ label: d.toLocaleDateString("ru", { weekday: "short" }), count: events.filter((e) => e.event_date === key).length });
    }
    return days;
  }, [events, now]);

  const monthly = useMemo(() => {
    const y = now.getFullYear();
    const m = now.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const points: { label: string; count: number }[] = [];
    const stride = daysInMonth > 31 ? 1 : 1;
    void stride;
    let bucket = 0;
    let acc = 0;
    const step = Math.max(1, Math.round(daysInMonth / 10));
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      acc += events.filter((e) => e.event_date === key).length;
      bucket++;
      if (bucket === step || d === daysInMonth) {
        points.push({ label: `${d}`, count: acc });
        acc = 0;
        bucket = 0;
      }
    }
    return points;
  }, [events, now]);

  const yearly = useMemo(() => {
    const y = now.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => {
      const key = `${y}-${String(i + 1).padStart(2, "0")}`;
      return {
        label: new Date(y, i, 1).toLocaleDateString("ru", { month: "short" }),
        count: events.filter((e) => e.event_date.startsWith(key)).length
      };
    });
    return months;
  }, [events, now]);

  const streaks = useMemo(() => computeStreaks(events), [events]);
  const avgGap = useMemo(() => averageGapDays(events), [events]);

  const thisMonth = useMemo(() => {
    const key = todayKey().slice(0, 7);
    return events.filter((e) => e.event_date.startsWith(key)).length;
  }, [events]);

  const prevMonthCount = useMemo(() => {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const key = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    return events.filter((e) => e.event_date.startsWith(key)).length;
  }, [events, now]);

  const monthDiff = prevMonthCount === 0 ? (thisMonth > 0 ? 100 : 0) : Math.round(((thisMonth - prevMonthCount) / prevMonthCount) * 100);

  const tooltipStyle = {
    background: "var(--bg-elev)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "var(--fg)",
    fontSize: 12
  } as const;

  return (
    <div className="pb-6">
      <PageHeader title="Статистика" />

      {/* Comparison */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <StatCard label="Текущий месяц" value={thisMonth} icon="📈" accent="blue" />
        <StatCard label="Пред. месяц" value={prevMonthCount} icon="📉" accent="cyan" />
      </div>
      <div className="mx-4 mt-3 card flex items-center gap-3 p-4">
        <span className="text-2xl">⚖️</span>
        <div className="flex-1">
          <p className="text-sm font-bold">Сравнение с прошлым месяцем</p>
          <p className="text-xs text-[var(--fg-muted)]">
            {monthDiff >= 0 ? `+${monthDiff}% к прошлому месяцу` : `${monthDiff}% к прошлому месяцу`}
          </p>
        </div>
        <span className={`text-lg font-extrabold ${monthDiff <= 0 ? "text-accent-green" : "text-accent-red"}`}>
          {monthDiff >= 0 ? "↑" : "↓"} {Math.abs(monthDiff)}%
        </span>
      </div>

      <SectionTitle>За неделю</SectionTitle>
      <div className="mx-4 card p-4">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekly} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--fg-muted)" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--fg-muted)" }} axisLine={false} tickLine={false} width={24} />
            <Tooltip cursor={false} contentStyle={tooltipStyle} />
            <Bar dataKey="count" radius={[6, 6, 6, 6]}>
              {weekly.map((e, i) => (
                <Cell key={i} fill={e.count > 0 ? "url(#barGradWeek)" : "var(--border)"} />
              ))}
            </Bar>
            <defs>
              <linearGradient id="barGradWeek" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6090fa" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <SectionTitle>За месяц</SectionTitle>
      <div className="mx-4 card p-4">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={monthly}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b6df6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b6df6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--fg-muted)" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--fg-muted)" }} axisLine={false} tickLine={false} width={24} />
            <Tooltip cursor={false} contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="count" stroke="#3b6df6" strokeWidth={2.5} fill="url(#areaGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <SectionTitle>За год</SectionTitle>
      <div className="mx-4 card p-4">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={yearly} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--fg-muted)" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--fg-muted)" }} axisLine={false} tickLine={false} width={24} />
            <Tooltip cursor={false} contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="url(#barGradYear)" radius={[6, 6, 6, 6]} />
            <defs>
              <linearGradient id="barGradYear" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#6090fa" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <SectionTitle>Ключевые показатели</SectionTitle>
      <div className="mx-4 grid grid-cols-2 gap-3">
        <StatCard label="Сред. интервал" value={avgGap ? Math.round(avgGap * 10) / 10 : "—"} suffix={avgGap ? "дн." : ""} icon="⏱" accent="cyan" />
        <StatCard label="Рекорд серии" value={streaks.longestStreak} suffix="дн." icon="🔥" accent="red" />
        <StatCard label="Текущая серия" value={streaks.currentStreak} suffix="дн." icon="⚡" accent="green" />
        <StatCard label="Всего событий" value={events.length} icon="🏁" accent="blue" />
      </div>
    </div>
  );
}