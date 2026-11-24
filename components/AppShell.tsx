"use client";

import { ReactNode } from "react";
import { useApp } from "./AppProvider";
import { BottomNav } from "./BottomNav";

/**
 * Wraps every screen: handles booting / auth-failed gate, applies safe-area
 * padding above the fixed bottom nav, and renders the navigation bar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { booting, authFailed, ready } = useApp();

  if (!ready || booting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <div className="relative h-16 w-16">
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slateblue-500 to-cyan-400 animate-pulse-ring" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">🌀</span>
        </div>
        <p className="text-sm text-[var(--fg-muted)]">Загружаем твои данные…</p>
      </div>
    );
  }

  if (authFailed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="text-lg font-bold">Не удалось войти</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Открой приложение через Telegram Mini App. Если проблема не уходит — попробуй открыть бота заново.
        </p>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.location.reload();
          }}
          className="btn-primary mt-2 rounded-2xl px-6 py-3 text-sm font-semibold"
        >
          Попробовать снова
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col pb-[max(env(safe-area-inset-bottom),96px)]">
      {children}
      <BottomNav />
    </div>
  );
}