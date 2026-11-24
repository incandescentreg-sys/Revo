"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PageHeader } from "@/components/ui";
import { EventModal } from "@/components/EventModal";
import { buildMonthGrid, todayKey, keyFromDate, isFuture, formatTime, monthLabel } from "@/lib/dates";
import { groupByDay } from "@/lib/stats";
import { EventRow } from "@/lib/types";

const WEEKDAYS = ["П", "В", "С", "Ч", "П", "С", "В"];

export default function CalendarPage() {
  const { events, deleteEvent, updateEvent, notify } = useApp();
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);

  const byDay = useMemo(() => groupByDay(events), [events]);
  const grid = useMemo(() => buildMonthGrid(view.y, view.m), [view]);

  const today = todayKey();
  const selectedEvents = selected ? (byDay.get(selected) ?? []) : [];

  const nav = (dir: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + dir, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const dayColor = (date: Date): { bg: string; text: string; dot: boolean } => {
    const key = keyFromDate(date);
    if (isFuture(date, now)) return { bg: "bg-[var(--bg)]", text: "text-[var(--fg-muted)]/50", dot: false };
    if (key === today) return { bg: "bg-slateblue-500 text-white shadow-glow", text: "text-white", dot: false };
    if (byDay.has(key)) return { bg: "bg-accent-red text-white", text: "text-white", dot: false };
    // Clean day (no mark) → green tint
    return { bg: "bg-accent-green/15 text-accent-green", text: "text-accent-green", dot: true };
  };

  const openDay = (date: Date) => {
    const key = keyFromDate(date);
    if (isFuture(date, now)) return;
    setSelected(key);
  };

  const handleEditSave = async (input: { event_date: string; event_time: string; mood?: string; comment?: string }) => {
    if (editing) {
      await updateEvent(editing.id, input);
      setModalOpen(false);
      setEditing(null);
      setSelected(input.event_date);
    }
  };

  return (
    <div className="pb-6">
      <PageHeader title="Календарь" />

      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 pt-4">
        <button onClick={() => nav(-1)} className="btn-ghost flex h-9 w-9 items-center justify-center rounded-full">
          ‹
        </button>
        <h2 className="text-base font-extrabold capitalize">{monthLabel(new Date(view.y, view.m, 1))}</h2>
        <button
          onClick={() => nav(1)}
          disabled={view.y === now.getFullYear() && view.m === now.getMonth()}
          className="btn-ghost flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {/* Weekday header */}
      <div className="mt-3 grid grid-cols-7 gap-1 px-3">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-bold uppercase text-[var(--fg-muted)]">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1 px-3">
        {grid.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="aspect-square" />;
          const c = dayColor(date);
          return (
            <button
              key={keyFromDate(date)}
              onClick={() => openDay(date)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl text-sm font-semibold transition-all active:scale-95 ${c.bg} ${c.text}`}
            >
              {date.getDate()}
              {c.dot && <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-accent-green" />}
              {date.getDate() === 1 && (
                <span className="absolute left-1.5 top-1 text-[9px] font-bold opacity-60">
                  {new Date(view.y, view.m, 1).toLocaleString("ru", { month: "short" })}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 px-4 text-[11px] text-[var(--fg-muted)]">
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-accent-green/60" /> чисто</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-accent-red" /> отметка</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-slateblue-500" /> сегодня</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[var(--bg)] border border-[var(--border)]" /> будущее</span>
      </div>

      {/* Legend / streak summary for selected month */}
      <MonthSummary />

      {/* Day detail bottom sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="animate-slide-up w-full max-w-md rounded-t-3xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 pb-[max(env(safe-area-inset-bottom),20px)]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold capitalize">{new Date(`${selected}T00:00:00`).toLocaleString("ru", { weekday: "long", day: "numeric", month: "long" })}</h3>
                <p className="text-xs text-[var(--fg-muted)]">
                  {selected === today ? "Сегодня" : ""} {byDay.has(selected) ? `· ${byDay.get(selected)!.length} зап.` : "· без отметок"}
                </p>
              </div>
              <div className="flex gap-2">
                {!byDay.has(selected) && !isFuture(new Date(`${selected}T00:00:00`), now) && (
                  <button
                    onClick={() => {
                      setEditing(null);
                      setModalOpen(true);
                    }}
                    className="btn-primary rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    ＋ Добавить
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="btn-ghost flex h-9 w-9 items-center justify-center rounded-full">
                  ✕
                </button>
              </div>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="border-t border-[var(--border)] py-6 text-center text-sm text-[var(--fg-muted)]">
                В этот день не было отметок
              </p>
            ) : (
              <div className="max-h-[45vh] space-y-2 overflow-y-auto border-t border-[var(--border)] pt-3">
                {selectedEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                    <span className="text-2xl">{e.mood ?? "⏰"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{formatTime(e.event_time)}</p>
                      <p className="truncate text-xs text-[var(--fg-muted)]">{e.comment || "Без комментария"}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditing(e);
                          setModalOpen(true);
                        }}
                        className="btn-ghost rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Удалить эту запись?")) deleteEvent(e.id);
                        }}
                        className="rounded-lg border border-accent-red/30 bg-accent-red/10 px-2.5 py-1.5 text-xs font-semibold text-accent-red"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <EventModal
        open={modalOpen}
        mode={editing ? "edit" : "add"}
        event={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleEditSave}
      />
    </div>
  );
}

function MonthSummary() {
  const { events } = useApp();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthCount = events.filter((e) => e.event_date.startsWith(monthKey)).length;
  const total = events.length;
  const pct = total ? Math.round((monthCount / total) * 100) : 0;
  return (
    <div className="mx-4 mt-4 card flex items-center gap-4 p-4">
      <div className="text-3xl">🗓️</div>
      <div className="flex-1">
        <p className="text-sm font-bold">Этот месяц</p>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--bg)]">
          <div className="h-full rounded-full bg-gradient-to-r from-slateblue-500 to-cyan-400" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-extrabold">{monthCount}</p>
        <p className="text-[11px] text-[var(--fg-muted)]">из {total}</p>
      </div>
    </div>
  );
}