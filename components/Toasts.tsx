"use client";

import { useApp } from "./AppProvider";

const TONE_ICON: Record<string, string> = {
  neutral: "ℹ️",
  success: "✅",
  error: "⚠️"
};

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-fade-in glass flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium shadow-card"
        >
          <span>{TONE_ICON[t.tone ?? "neutral"]}</span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}