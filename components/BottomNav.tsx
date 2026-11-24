"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/calendar", label: "Календарь", icon: "calendar" },
  { href: "/stats", label: "Статистика", icon: "chart" },
  { href: "/partner", label: "Партнёр", icon: "heart" },
  { href: "/profile", label: "Профиль", icon: "user" }
] as const;

function Icon({ name }: { name: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };
  switch (name) {
    case "home":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
        </svg>
      );
    case "calendar":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...common}>
          <rect x="3" y="4.5" width="18" height="16" rx="3" />
          <path d="M8 3v3M16 3v3M3 9h18" />
        </svg>
      );
    case "chart":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...common}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case "heart":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...common}>
          <path d="M12 20s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.6A4.5 4.5 0 0 1 20 9c0 5.7-8 11-8 11Z" />
        </svg>
      );
    case "user":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
        </svg>
      );
    default:
      return null;
  }
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-[max(env(safe-area-inset-bottom),10px)] left-1/2 z-40 w-[calc(100%-20px)] max-w-md -translate-x-1/2">
      <div className="glass flex items-center justify-around rounded-[26px] border border-[var(--border)] px-1.5 py-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)]">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 transition-all duration-200 ${
                active ? "nav-chip-active" : "text-[var(--fg-muted)]"
              }`}
            >
              <Icon name={item.icon} />
              <span className="text-[9px] font-semibold tracking-wide leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}