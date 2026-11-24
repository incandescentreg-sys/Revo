"use client";

import { useEffect, useState } from "react";
import { MOODS, EventRow } from "@/lib/types";

interface Props {
  open: boolean;
  mode: "add" | "edit";
  event?: EventRow | null;
  onClose: () => void;
  onSave: (input: { event_date: string; event_time: string; mood?: string; comment?: string }) => Promise<void>;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function EventModal({ open, mode, event, onClose, onSave }: Props) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (mode === "edit" && event) {
        setDate(event.event_date);
        setTime((event.event_time ?? "12:00:00").slice(0, 5));
        setMood(event.mood);
        setComment(event.comment ?? "");
      } else {
        const now = new Date();
        setDate(now.toISOString().slice(0, 10));
        setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
        setMood(null);
        setComment("");
      }
    }
  }, [open, mode, event]);

  if (!open) return null;

  const handleSave = async () => {
    if (!date) {
      setError("Укажи дату");
      return;
    }
    if (!time) {
      setError("Укажи время");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        event_date: date,
        event_time: time.includes(":") ? `${time}:00` : `${time}:00`,
        mood: mood ?? undefined,
        comment
      });
      onClose();
    } catch (e) {
      setError("Не удалось сохранить. Попробуй ещё раз.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in sm:items-center">
      <div className="animate-slide-up w-full max-w-md rounded-t-3xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 pb-[max(env(safe-area-inset-bottom),20px)] sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{mode === "edit" ? "Изменить запись" : "Новое событие"}</h2>
          <button onClick={onClose} className="btn-ghost flex h-9 w-9 items-center justify-center rounded-full text-lg">
            ✕
          </button>
        </div>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Дата</label>
        <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="input mb-3" />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Время</label>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input mb-3" />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Настроение</label>
        <div className="mb-3 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMood(mood === m ? null : m)}
              className={`h-11 w-11 rounded-2xl border text-xl transition-all ${
                mood === m
                  ? "border-slateblue-500 bg-slateblue-500/15 shadow-glow"
                  : "border-[var(--border)] bg-[var(--bg)]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
          Комментарий <span className="normal-case">(необязательно)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={280}
          placeholder="Краткая заметка…"
          className="input mb-1 resize-none"
        />
        <div className="mb-3 flex justify-end text-[11px] text-[var(--fg-muted)]">{comment.length}/280</div>

        {error && <p className="mb-2 text-sm font-medium text-accent-red">{error}</p>}

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full rounded-2xl py-3.5 text-sm font-bold disabled:opacity-60">
          {saving ? "Сохраняем…" : mode === "edit" ? "Сохранить изменения" : "Зафиксировать"}
        </button>
      </div>
    </div>
  );
}