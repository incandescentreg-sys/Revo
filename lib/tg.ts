"use client";

import { getDevTelegramUser, TelegramUser } from "@/lib/telegram";

/**
 * We intentionally do NOT `import "@twa-dev/sdk"` at the top of the module:
 * that package reads `window` at import time, which breaks Next.js SSR
 * prerendering ("window is not defined"). Instead we read the SDK lazily
 * from `window.Telegram.WebApp` — the object injected by the official
 * telegram-web-app.js script we load in layout.tsx.
 */

type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type NotificationType = "error" | "success" | "warning";

export interface TelegramWebAppSdk {
  initData?: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      language_code?: string;
      allows_write_to_pm?: boolean;
      is_premium?: boolean;
    };
    start_param?: string;
    auth_date?: number;
  };
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  setBottomBarColor?: (color: string) => void;
  HapticFeedback?: {
    impactOccurred?: (style: ImpactStyle) => void;
    notificationOccurred?: (type: NotificationType) => void;
    selectionChanged?: () => void;
  };
}

function getSDK(): TelegramWebAppSdk | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebAppSdk } }).Telegram?.WebApp ?? null;
}

export function isTelegramWebApp(): boolean {
  const sdk = getSDK();
  return !!sdk?.initData && !!sdk?.initDataUnsafe?.user?.id;
}

export function getTelegramInitData(): string {
  return getSDK()?.initData ?? "";
}

export function getTelegramUser(): TelegramUser | undefined {
  const user = getSDK()?.initDataUnsafe?.user;
  if (user?.id) {
    return user as TelegramUser;
  }
  return getDevTelegramUser();
}

export function configureTelegram(): void {
  const sdk = getSDK();
  try {
    sdk?.ready?.();
    sdk?.expand?.();
    sdk?.setHeaderColor?.("#0e1420");
    sdk?.setBackgroundColor?.("#0e1420");
    sdk?.disableVerticalSwipes?.();
    sdk?.setBottomBarColor?.("#101522");
  } catch {
    /* running outside Telegram — ignore */
  }
}

export function haptic(style: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light"): void {
  try {
    const hf = getSDK()?.HapticFeedback;
    if (!hf) return;
    if (style === "success" || style === "warning" || style === "error") {
      hf.notificationOccurred?.(style);
    } else {
      hf.impactOccurred?.(style);
    }
  } catch {
    /* ignore outside Telegram */
  }
}