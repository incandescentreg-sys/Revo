"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { PageHeader, StatCard, SectionTitle } from "@/components/ui";
import { EventModal } from "@/components/EventModal";
import { ACHIEVEMENTS, GOAL_DAYS, GoalDays, Theme, EventRow } from "@/lib/types";
import { formatDateHuman, formatTime } from "@/lib/dates";

export default function ProfilePage() {
  const {
    profile,
    events,
    goals,
    achievements,
    updateProfile,
    setActiveGoal,
    cancelActiveGoal,
    deleteEvent,
    notify,
    resetData,
    updateEvent
  } = useApp();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile?.name ?? "");
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const activeGoal = goals.find((g) => g.status === "active");
  const ownedAchievements = useMemo(() => new Set(achievements.map((a) => a.code)), [achievements]);

  const sortedEvents = useMemo(() => [...events].sort((a, b) => (a.event_date < b.event_date ? 1 : -1)), [events]);

  const goalProgress = useMemo(() => {
    if (!activeGoal) return null;
    const start = new Date(activeGoal.start_date + "T00:00:00");
    const el = Math.min(Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000)), activeGoal.goal_days);
    return { el, total: activeGoal.goal_days, pct: Math.min(1, el / activeGoal.goal_days) };
  }, [activeGoal]);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const botStartLink = profile ? `https://t.me/${botUsername ?? "MyMomentumBot"}?start=${btoa(profile.id).replace(/=+$/, "")}` : null;

  const handleSaveName = async () => {
    await updateProfile({ name: nameDraft.trim() || "Пользователь" });
    setEditingName(false);
  };

  const handleExport = async (format: "json" | "csv") => {
    const token = window.localStorage.getItem("mt_token");
    try {
      const res = await fetch(`/api/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "json" ? "momentum-export.json" : "momentum-export.csv";
      a.click();
      URL.revokeObjectURL(url);
      notify("Экспорт готов", "success");
    } catch {
      notify("Ошибка экспорта", "error");
    }
  };

  const handleClearHistory = async () => {
    const token = window.localStorage.getItem("mt_token");
    const service = await import("@/lib/supabase").then((m) => m.createBrowserSupabaseClient(token));
    const { error } = await service.from("events").delete().eq("user_id", profile!.id);
    if (error) {
      notify("Ошибка очистки", "error");
      return;
    }
    setConfirmClearHistory(false);
    notify("История очищена", "neutral");
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    const token = window.localStorage.getItem("mt_token");
    try {
      const res = await fetch("/api/account", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("delete failed");
      window.localStorage.removeItem("mt_token");
      notify("Аккаунт удалён", "neutral");
      window.location.reload();
    } catch {
      notify("Ошибка удаления", "error");
    }
  };

  const handleTestNotify = async () => {
    const token = window.localStorage.getItem("mt_token");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: "🔔 Момент: напоминание работает! Продолжай держать темп." })
      });
      const json = await res.json();
      if (json?.ok) notify("Отправлено в Telegram", "success");
      else if (json?.reason === "no_chat_id") notify("Сначала свяжи бота (кнопка ниже)", "neutral");
      else if (json?.reason === "notifications_disabled") notify("Включи уведомления", "neutral");
      else notify("Не удалось отправить", "error");
    } catch {
      notify("Ошибка", "error");
    }
  };

  const handleGoal = async (d: GoalDays) => {
    await setActiveGoal(d);
  };

  const themeOptions: { key: Theme; label: string; icon: string }[] = [
    { key: "auto", label: "Авто", icon: "🔄" },
    { key: "light", label: "Светлая", icon: "☀️" },
    { key: "dark", label: "Тёмная", icon: "🌙" }
  ];

  return (
    <div className="pb-6">
      <PageHeader title="Профиль" />

      {/* Identity */}
      <div className="mx-4 mt-4 card flex items-center gap-4 p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slateblue-500 to-cyan-400 text-xl font-bold text-white">
          {(profile?.name?.[0] ?? "T").toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="input !py-1.5 text-sm"
                maxLength={40}
              />
              <button onClick={handleSaveName} className="btn-primary rounded-xl px-3 py-1.5 text-xs font-bold">
                ОК
              </button>
            </div>
          ) : (
            <>
              <p className="flex items-center gap-1 text-lg font-extrabold">{profile?.name ?? ""} <button onClick={() => { setNameDraft(profile?.name ?? ""); setEditingName(true); }} className="text-sm text-[var(--fg-muted)]">✎</button></p>
              <p className="text-xs text-[var(--fg-muted)]">ID: {profile?.telegram_id ?? "—"}</p>
            </>
          )}
        </div>
      </div>

      {/* Theme */}
      <SectionTitle>Тема</SectionTitle>
      <div className="mx-4 grid grid-cols-3 gap-2">
        {themeOptions.map((t) => (
          <button
            key={t.key}
            onClick={() => updateProfile({ theme: t.key })}
            className={`card flex flex-col items-center gap-1 p-3 text-sm font-semibold transition-all ${
              (profile?.theme ?? "auto") === t.key ? "!border-slateblue-500 shadow-glow" : ""
            }`}
          >
            <span className="text-xl">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Goals */}
      <SectionTitle>Цель воздержания</SectionTitle>
      <div className="mx-4 grid grid-cols-5 gap-2">
        {GOAL_DAYS.map((d) => (
          <button
            key={d}
            onClick={() => handleGoal(d)}
            disabled={!!activeGoal}
            className={`card flex flex-col items-center justify-center gap-0.5 p-2 text-center transition-all disabled:opacity-40 ${
              activeGoal?.goal_days === d ? "!border-slateblue-500 shadow-glow" : ""
            }`}
          >
            <span className="text-lg font-extrabold">{d}</span>
            <span className="text-[10px] text-[var(--fg-muted)]">дн</span>
          </button>
        ))}
      </div>

      {activeGoal && goalProgress ? (
        <div className="mx-4 mt-3 card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">🎯 {activeGoal.goal_days}-дневная цель</p>
            <span className="text-xs font-bold text-slateblue-500">{goalProgress.el}/{goalProgress.total} дн.</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--bg)]">
            <div className="h-full rounded-full bg-gradient-to-r from-slateblue-500 to-cyan-400 transition-all" style={{ width: `${Math.round(goalProgress.pct * 100)}%` }} />
          </div>
          <button onClick={cancelActiveGoal} className="mt-3 text-xs font-semibold text-accent-red underline-offset-2 hover:underline">
            Отменить цель
          </button>
        </div>
      ) : (
        <p className="mx-4 mt-2 px-1 text-xs text-[var(--fg-muted)]">
          {profile?.name ? `${profile.name.split(" ")[0]}, выбери срок — прогресс появится здесь.` : "Выбери срок цели."}
        </p>
      )}

      {/* Achievements */}
      <SectionTitle>Достижения</SectionTitle>
      <div className="mx-4 grid grid-cols-2 gap-2">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = ownedAchievements.has(a.code);
          return (
            <div
              key={a.code}
              className={`card flex items-center gap-3 p-3 transition-all ${unlocked ? "" : "opacity-45 grayscale"}`}
            >
              <span className="text-2xl">{a.icon}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{a.title}</p>
                <p className="truncate text-[11px] text-[var(--fg-muted)]">{unlocked ? a.description : `${a.days} дн. серии`}</p>
              </div>
              {unlocked && <span className="ml-auto text-slateblue-500">✓</span>}
            </div>
          );
        })}
      </div>

      {/* Notifications */}
      <SectionTitle>Уведомления</SectionTitle>
      <div className="mx-4 card p-4">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Telegram-напоминания</p>
            <p className="text-xs text-[var(--fg-muted)]">Поддерживающие сообщения по цели</p>
          </div>
          <button
            role="switch"
            aria-checked={!!profile?.notifications_enabled}
            onClick={() => updateProfile({ notifications_enabled: !profile?.notifications_enabled })}
            className={`relative h-7 w-12 rounded-full transition-colors ${profile?.notifications_enabled ? "bg-slateblue-500" : "bg-[var(--bg)] border border-[var(--border)]"}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${profile?.notifications_enabled ? "left-6" : "left-1"}`}
            />
          </button>
        </label>

        {profile?.notifications_enabled && (
          <div className="mt-3 border-t border-[var(--border)] pt-3">
            {!profile.chat_id && botStartLink ? (
              <a href={botStartLink} target="_blank" rel="noreferrer" className="btn-ghost mb-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold">
                🐝 Связать бота (нажми Start)
              </a>
            ) : null}
            <div className="flex gap-2">
              <button onClick={handleTestNotify} className="btn-ghost flex-1 rounded-xl py-2.5 text-sm font-semibold">
                Отправить тест
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[var(--fg-muted)]">
              {profile.chat_id ? "Бот связан с этим аккаунтом." : "Открой бота и нажми Start, чтобы получать напоминания."}
            </p>
          </div>
        )}
      </div>

      {/* History */}
      <SectionTitle>
        <div className="flex w-full items-center justify-between">
          <span>История</span>
          <button onClick={() => setShowHistory((s) => !s)} className="text-xs font-bold text-slateblue-500">
            {showHistory ? "Свернуть" : `Показать ${sortedEvents.length}`}
          </button>
        </div>
      </SectionTitle>

      {showHistory && (
        <div className="mx-4 space-y-2">
          {sortedEvents.length === 0 ? (
            <p className="card p-4 text-center text-sm text-[var(--fg-muted)]">Записей пока нет.</p>
          ) : (
            sortedEvents.map((e) => (
              <div key={e.id} className="card flex items-center gap-3 p-3">
                <span className="text-2xl">{e.mood ?? "⏰"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{formatDateHuman(e.event_date)} · {formatTime(e.event_time)}</p>
                  <p className="truncate text-xs text-[var(--fg-muted)]">{e.comment || "—"}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const start = new Date();
                      void start;
                      setEditing(e);
                      setModalOpen(true);
                    }}
                    className="btn-ghost rounded-lg px-2.5 py-1.5 text-xs"
                  >✎</button>
                  <button
                    onClick={() => deleteEvent(e.id)}
                    className="rounded-lg border border-accent-red/30 bg-accent-red/10 px-2.5 py-1.5 text-xs text-accent-red"
                  >🗑</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Partner */}
      <SectionTitle>Партнёр</SectionTitle>
      <div className="mx-4 card p-4">
        <Link
          href="/partner"
          className="mb-3 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💞</span>
            <div>
              <p className="text-sm font-bold">{profile?.partner_id ? "Мой партнёр" : "Подключить партнёра"}</p>
              <p className="text-xs text-[var(--fg-muted)]">Просмотр цикла и уведомления</p>
            </div>
          </div>
          <span className="text-slateblue-500">›</span>
        </Link>

        <label className="flex cursor-pointer items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Сообщать партнёру о событиях</p>
            <p className="text-xs text-[var(--fg-muted)]">После отметки партнёр получит «У тебя новое событие»</p>
          </div>
          <button
            role="switch"
            aria-checked={!!profile?.notify_partner_on_event}
            onClick={() => updateProfile({ notify_partner_on_event: !profile?.notify_partner_on_event })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${profile?.notify_partner_on_event ? "bg-slateblue-500" : "bg-[var(--bg)] border border-[var(--border)]"}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${profile?.notify_partner_on_event ? "left-6" : "left-1"}`}
            />
          </button>
        </label>
      </div>

      {/* Data */}
      <SectionTitle>Данные</SectionTitle>
      <div className="mx-4 grid grid-cols-2 gap-2">
        <button onClick={() => handleExport("json")} className="btn-ghost rounded-xl py-3 text-sm font-semibold">⬇️ Экспорт JSON</button>
        <button onClick={() => handleExport("csv")} className="btn-ghost rounded-xl py-3 text-sm font-semibold">⬇️ Экспорт CSV</button>
        {confirmClearHistory ? (
          <button onClick={handleClearHistory} className="col-span-2 rounded-xl border border-accent-red/40 bg-accent-red/10 py-3 text-sm font-bold text-accent-red">
            Точно удалить всю историю?
          </button>
        ) : (
          <button
            onClick={() => setConfirmClearHistory(true)}
            className="col-span-2 rounded-xl border border-accent-red/30 py-3 text-sm font-semibold text-accent-red"
          >
            🗑 Удалить всю историю
          </button>
        )}
      </div>

      {/* Danger zone */}
      <SectionTitle>Опасная зона</SectionTitle>
      <div className="mx-4 pb-4">
        {confirmDeleteAccount ? (
          <div className="card border-accent-red/40 p-4">
            <p className="mb-3 text-sm font-semibold">
              Все твои записи, достижения и цели будут удалены безвозвратно. Точно уверен?
            </p>
            <div className="flex gap-2">
              <button onClick={handleDeleteAccount} className="flex-1 rounded-xl bg-accent-red py-3 text-sm font-bold text-white">Удалить навсегда</button>
              <button onClick={() => setConfirmDeleteAccount(false)} className="btn-ghost flex-1 rounded-xl py-3 text-sm font-semibold">Отмена</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDeleteAccount(true)} className="w-full rounded-xl border border-accent-red/30 py-3 text-sm font-semibold text-accent-red">
            Удалить аккаунт
          </button>
        )}
      </div>

      <EventModal
        open={modalOpen}
        mode="edit"
        event={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={(input) => editing ? updateEvent(editing.id, input) : Promise.resolve()}
      />
    </div>
  );
}