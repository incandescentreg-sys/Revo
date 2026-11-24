"use client";

import { ReactNode } from "react";

export function PageHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 glass border-b border-[var(--border)] px-5 pb-3 pt-[max(env(safe-area-inset-top),16px)]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {right}
      </div>
    </header>
  );
}

export function StatCard({
  label,
  value,
  suffix,
  icon,
  accent = "blue"
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon?: ReactNode;
  accent?: "blue" | "green" | "red" | "cyan";
}) {
  const accents: Record<string, string> = {
    blue: "from-slateblue-500/15 to-slateblue-300/5 text-slateblue-500",
    green: "from-accent-green/15 to-emerald-300/5 text-accent-green",
    red: "from-accent-red/15 to-rose-300/5 text-accent-red",
    cyan: "from-cyan-400/15 to-sky-300/5 text-cyan-400"
  };
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl ${accents[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[var(--fg-muted)]">{label}</p>
        <p className="text-lg font-extrabold leading-tight">
          {value}
          {suffix ? <span className="ml-0.5 text-sm font-semibold text-[var(--fg-muted)]">{suffix}</span> : null}
        </p>
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-5 px-1 text-sm font-bold uppercase tracking-wider text-[var(--fg-muted)]">{children}</h2>;
}