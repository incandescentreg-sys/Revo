"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { StatCard } from "@/components/ui";
import { EventModal } from "@/components/EventModal";
import { computeStreaks } from "@/lib/stats";
import { todayKey } from "@/lib/dates";
import { MOTIVATION } from "@/lib/types";

export default function HomePage() {
  const { profile, events, goals, addEvent, deleteEvent, notify } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const stats = useMemo(() => computeStreaks(events), [events]);
  const activeGoal = goals.find((g) => g.status === "active");

  const streakNow = useMemo(() => {
    // If user has no events and never started, streak is "today".
    if (events.length === 0) return stats.currentStreak;
    return stats.currentStreak;
  }, [events, stats]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Доброй ночи";
    if (h < 12) return "Доброе утро";
    if (h < 18) return "Добрый день";
    return "Добрый вечер";
  }, []);

  const motivation = useMemo(() => {
    const today = todayKey();
    const idx = Array.from(today).reduce((a, c) => a + c.charCodeAt(0), 0) % MOTIVATION.length;
    return MOTIVATION[idx] ?? MOTIVATION[0];
  }, []);

  const lastEvent = useMemo(
    () => [...events].sort((a, b) => (a.event_date < b.event_date ? 1 : -1))[0] ?? null,
    [events]
  );

  const goalProgress = useMemo(() => {
    if (!activeGoal) return null;
    const now = new Date();
    const start = new Date(activeGoal.start_date + "T00:00:00");
    // days between goal start and today (local).
    const sinceStart = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
    const progress = Math.max(0, sinceStart) / activeGoal.goal_days;
    return { sinceStart: Math.min(sinceStart, activeGoal.goal_days), goal: activeGoal.goal_days, progress: Math.min(progress, 1) };
  }, [activeGoal]);

  const monthCount = useMemo(() => {
    const m = todayKey().slice(0, 7);
    return events.filter((e) => e.event_date.startsWith(m)).length;
  }, [events]);

  const activeToday = useMemo(() => {
    const t = todayKey();
    return events.some((e) => e.event_date === t);
  }, [events]);

  const handleMark = async (input: { event_date: string; event_time: string; mood?: string; comment?: string }) => {
    await addEvent(input);
    setModalOpen(false);
  };

  const handleCancelLast = async () => {
    if (!lastEvent) return;
    try {
      await deleteEvent(lastEvent.id);
      setConfirmCancel(false);
      notify("Последняя запись отменена", "neutral");
    } catch {
      notify("Не удалось отменить", "error");
    }
  };

  return (
    <div className="px-4 pt-[max(env(safe-area-inset-top),16px)]">
      <header className="mb-1 flex items-center justify-between px-1">
        <div>
          <p className="text-sm text-[var(--fg-muted)]">{greeting},</p>
          <h1 className="text-2xl font-extrabold tracking-tight">{profile?.name ?? "друг"} 👋</h1>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slateblue-500 to-cyan-400 text-lg font-bold text-white">
          {(profile?.name?.[0] ?? "T").toUpperCase()}
        </div>
      </header>

      {/* Motivation */}
      <div className="grad-border card mt-4 flex items-center gap-3 p-4">
        <span className="text-2xl">💡</span>
        <p className="text-sm font-medium leading-snug">{motivation}</p>
      </div>

      {/* Streak hero */}
      <div className="relative mt-4 overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-slateblue-600 via-slateblue-500 to-cyan-500 p-5 text-white shadow-card">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-black/10" />
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Текущая серия</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-5xl font-black">{streakNow}</span>
          <span className="text-sm font-medium text-white/80">дн.</span>
        </div>
        <p className="mt-2 text-sm text-white/80">
          {activeToday ? "Событие уже отмечено сегодня" : lastEvent ? `Без отметок уже ${stats.daysSinceLast ?? 0} дн.` : "Начни свой путь прямо сейчас"}
        </p>

        {activeGoal && goalProgress ? (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs font-medium text-white/80">
              <span>Цель: {activeGoal.goal_days} дней</span>
              <span>{goalProgress.sinceStart}/{goalProgress.goal}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${Math.round(goalProgress.progress * 100)}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      {/* Big mark button */}
      <button
        onClick={() => setModalOpen(true)}
        className="mt-6 flex w-full flex-col items-center justify-center gap-2 rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] py-10 shadow-card transition-transform active:scale-[0.98]"
      >
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full btn-primary text-4xl">
          <span className="absolute inset-0 rounded-full animate-pulse-ring bg-current opacity-20" style={{ color: "#fff" }} />
          <span className="relative">＋</span>
        </span>
        <span className="text-sm font-bold text-[var(--fg-muted)]">Отметить событие</span>
      </button>

      {/* Cancel last record */}
      {lastEvent && !activeToday ? (
        confirmCancel ? (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-accent-red/30 bg-accent-red/10 px-4 py-3">
            <span className="text-sm font-medium">Отменить последнюю запись от {lastEvent.event_date}?</span>
            <div className="flex gap-2">
              <button onClick={handleCancelLast} className="rounded-xl bg-accent-red px-3 py-1.5 text-xs font-bold text-white">
                Да
              </button>
              <button onClick={() => setConfirmCancel(false)} className="btn-ghost rounded-xl px-3 py-1.5 text-xs font-bold">
                Нет
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmCancel(true)}
            className="mt-3 rounded-2xl border border-[var(--border)] px-4 py-2.5 text-xs font-semibold text-[var(--fg-muted)]"
          >
            ↩️ Отменить последнюю запись
          </button>
        )
      ) : null}

      {/* Stats grid */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatCard label="Всего отметок" value={events.length} icon="📊" accent="blue" />
        <StatCard label="За этот месяц" value={monthCount} icon="📅" accent="cyan" />
        <StatCard label="Рекорд серии" value={stats.longestStreak} suffix="дн." icon="🔥" accent="red" />
        <StatCard label="Последняя отметка" value={lastEvent ? lastEvent.event_date : "—"} icon="📍" accent="green" />
      </div>

      <EventModal open={modalOpen} mode="add" onClose={() => setModalOpen(false)} onSave={handleMark} />
    </div>
  );
}