"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PageHeader } from "@/components/ui";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { computeStreaks } from "@/lib/stats";
import { daysSince, todayKey, formatTime } from "@/lib/dates";
import { EventRow } from "@/lib/types";

export default function PartnerPage() {
  const { profile, partnerConnect, partnerDisconnect, notify } = useApp();
  const partnerId = profile?.partner_id ?? null;

  const [code, setCode] = useState("");
  const [partner, setPartner] = useState<{ id: string; name: string } | null>(null);
  const [partnerEvents, setPartnerEvents] = useState<EventRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadPartner = useCallback(async () => {
    if (!partnerId) {
      setPartner(null);
      setPartnerEvents([]);
      return;
    }
    setLoading(true);
    try {
      const token = window.localStorage.getItem("mt_token");
      const sb = createBrowserSupabaseClient(token);
      const [userRes, evRes] = await Promise.all([
        sb.from("users").select("id, name, created_at").eq("id", partnerId).maybeSingle(),
        sb.from("events").select("*").eq("user_id", partnerId).order("event_date", { ascending: false })
      ]);
      if (!userRes.error) setPartner(userRes.data as { id: string; name: string });
      if (!evRes.error) setPartnerEvents((evRes.data ?? []) as EventRow[]);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void loadPartner();
  }, [loadPartner]);

  const streaks = useMemo(() => computeStreaks(partnerEvents), [partnerEvents]);

  const myCode = profile?.id ?? "";

  const handleConnect = async () => {
    const c = (code ?? "").trim();
    if (!c) {
      notify("Введи код партнёра", "error");
      return;
    }
    setBusy(true);
    try {
      await partnerConnect(c);
      setCode("");
    } catch (e) {
      notify((e as Error).message ?? "Ошибка", "error");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(myCode).then(
      () => notify("Твой код скопирован", "success"),
      () => notify("Не удалось скопировать", "error")
    );
  };

  return (
    <div className="pb-6">
      <PageHeader title="Мой партнёр" />

      {!partnerId ? (
        /* ---------- Not connected ---------- */
        <div className="px-4 pt-4">
          <div className="grad-border card p-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-slateblue-500 to-cyan-400 text-3xl">
              💞
            </div>
            <h2 className="mt-3 text-lg font-extrabold">Подключи партнёра</h2>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Вы сможете видеть циклы друг друга и получать уведомления о событиях. Связь взаимная — оба должны согласиться.
            </p>
          </div>

          <div className="card mt-4 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Твой код</p>
            <div className="flex items-center gap-2">
              <code className="input !font-mono !text-xs">{myCode}</code>
              <button onClick={copyCode} className="btn-ghost shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold">
                Копировать
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[var(--fg-muted)]">Передай этот код партнёру.</p>
          </div>

          <div className="card mt-3 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Код партнёра</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Вставь код партнёра"
              className="input mb-3 !font-mono !text-xs"
            />
            <button onClick={handleConnect} disabled={busy} className="btn-primary w-full rounded-2xl py-3 text-sm font-bold disabled:opacity-60">
              {busy ? "Подключаем…" : "Подключиться"}
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-[var(--fg-muted)]">Загружаем…</div>
      ) : (
        /* ---------- Connected ---------- */
        <div className="px-4 pt-4">
          <div className="card flex items-center gap-4 p-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slateblue-500 to-cyan-400 text-xl font-bold text-white">
              {(partner?.name?.[0] ?? "П").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-lg font-extrabold">
                {partner?.name ?? "Партнёр"} <span className="text-sm">💞</span>
              </p>
              <p className="text-xs text-[var(--fg-muted)]">
                {loading ? "Загружаем…" : partnerEvents.length === 0 ? "Событий пока нет" : `${partnerEvents.length} зап. всего`}
              </p>
            </div>
            <button
              onClick={async () => {
                if (confirm("Отвязать партнёра?") ) await partnerDisconnect();
              }}
              className="rounded-xl border border-accent-red/30 px-3 py-2 text-xs font-semibold text-accent-red"
            >
              Отвязать
            </button>
          </div>

          {/* Partner's current state */}
          <div className="grad-border card mt-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Текущий статус</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-black">{streaks.currentStreak}</span>
              <span className="text-sm font-medium text-[var(--fg-muted)]">дн. текущая серия</span>
            </div>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              {partnerEvents.length === 0
                ? "Партнёр ещё не делал отметок"
                : streaks.lastEventDate
                ? `Последнее событие: ${streaks.lastEventDate} · ${daysSince(streaks.lastEventDate)} дн. назад`
                : ""}
            </p>
          </div>

          {/* Mini stats */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="card p-3 text-center">
              <p className="text-xl font-extrabold">{streaks.longestStreak}</p>
              <p className="text-[11px] text-[var(--fg-muted)]">рекорд, дн.</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-xl font-extrabold">{partnerEvents.length}</p>
              <p className="text-[11px] text-[var(--fg-muted)]">всего записей</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-xl font-extrabold">{streaks.daysSinceLast ?? "—"}</p>
              <p className="text-[11px] text-[var(--fg-muted)]">дн. с последней</p>
            </div>
          </div>

          {/* Partner's timeline */}
          {partnerEvents.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">Последние события</h3>
              <div className="space-y-2">
                {partnerEvents.slice(0, 10).map((e) => (
                  <div key={e.id} className="card flex items-center gap-3 p-3">
                    <span className="text-2xl">{e.mood ?? "⏰"}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{e.event_date}</p>
                      <p className="text-xs text-[var(--fg-muted)]">{formatTime(e.event_time)}</p>
                    </div>
                    {e.comment && <p className="max-w-[45%] truncate text-xs text-[var(--fg-muted)]">{e.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}