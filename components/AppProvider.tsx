"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode
} from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { configureTelegram, getTelegramInitData, getTelegramUser, isTelegramWebApp, haptic } from "@/lib/tg";
import {
  AchievementRow,
  EventRow,
  GoalDays,
  GoalRow,
  Profile,
  Theme
} from "@/lib/types";
import { ACHIEVEMENTS } from "@/lib/types";

export interface Toast {
  id: number;
  text: string;
  tone: "neutral" | "success" | "error";
}

interface AppState {
  ready: boolean;
  authFailed: boolean;
  booting: boolean;
  profile: Profile | null;
  events: EventRow[];
  goals: GoalRow[];
  achievements: AchievementRow[];
  loading: boolean;
  toasts: Toast[];
  notify: (text: string, tone?: Toast["tone"]) => void;
  refresh: () => Promise<void>;
  addEvent: (input: { event_date: string; event_time: string; mood?: string; comment?: string }) => Promise<void>;
  updateEvent: (id: string, patch: Partial<Pick<EventRow, "event_date" | "event_time" | "mood" | "comment">>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, "name" | "theme" | "notifications_enabled" | "notification_time" | "notify_partner_on_event">>) => Promise<void>;
  setActiveGoal: (days: GoalDays) => Promise<void>;
  cancelActiveGoal: () => Promise<void>;
  partnerConnect: (code: string) => Promise<void>;
  partnerDisconnect: () => Promise<void>;
  applyTheme: (t: Theme) => void;
  resetData: () => void;
}

const AppContext = createContext<AppState | null>(null);

let toastCounter = 1;

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const clientRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);
  const bootingRef = useRef(false);

  const notify = useCallback((text: string, tone: Toast["tone"] = "neutral") => {
    const id = toastCounter++;
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const getClient = useCallback(() => {
    if (!clientRef.current) {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem("mt_token") : null;
      clientRef.current = createBrowserSupabaseClient(stored);
    }
    return clientRef.current;
  }, []);

  const refresh = useCallback(async () => {
    if (!clientRef.current) return;
    const client = clientRef.current;

    const [eventsRes, goalsRes, achievementsRes] = await Promise.all([
      client.from("events").select("*").order("event_date", { ascending: true }),
      client.from("goals").select("*").order("created_at", { ascending: false }),
      client.from("achievements").select("*")
    ]);

    if (eventsRes.error) throw eventsRes.error;
    if (goalsRes.error || achievementsRes.error) {
      throw goalsRes.error || achievementsRes.error;
    }

    setEvents((eventsRes.data ?? []) as EventRow[]);
    setGoals((goalsRes.data ?? []) as GoalRow[]);
    setAchievements((achievementsRes.data ?? []) as AchievementRow[]);
  }, []);

  const boot = useCallback(async () => {
    if (bootingRef.current) return;
    bootingRef.current = true;
    configureTelegram();

    try {
      const initData = getTelegramInitData();
      const user = getTelegramUser();
      const dev = !isTelegramWebApp();

      if (!user && !initData) {
        setAuthFailed(true);
        setBooting(false);
        setReady(true);
        return;
      }

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, dev, telegramUser: dev ? user : undefined })
      });

      const payload = await res.json();
      if (!res.ok) {
        setAuthFailed(true);
        setBooting(false);
        setReady(true);
        return;
      }

      const token: string = payload.token;
      const profileData: Profile = payload.profile;

      window.localStorage.setItem("mt_token", token);
      clientRef.current = createBrowserSupabaseClient(token);

      setProfile(profileData);
      applyThemeLocal(profileData.theme ?? "auto");
      await refresh();
    } catch (err) {
      console.error("Boot failed", err);
      setAuthFailed(true);
    } finally {
      bootingRef.current = false;
      setBooting(false);
      setLoading(false);
      setReady(true);
    }
  }, [refresh]);

  // Boot once on mount.
  useEffect(() => {
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addEvent = useCallback(
    async (input: { event_date: string; event_time: string; mood?: string; comment?: string }) => {
      if (!clientRef.current || !profile) return;
      const client = clientRef.current;

      // Optimistic local insert first so the UI updates instantly.
      const { data, error } = await client
        .from("events")
        .insert({
          user_id: profile.id,
          event_date: input.event_date,
          event_time: input.event_time,
          mood: input.mood ?? null,
          comment: input.comment?.trim() ? input.comment.trim() : null
        })
        .select()
        .single();
      if (error) throw error;

      haptic("success");
      notify("Событие зафиксировано", "success");
      void refresh();
      void backfillAchievements();

      // Tell the partner via Telegram, if the user opted in.
      if (profile.notify_partner_on_event && profile.partner_id && profile.name) {
        try {
          const token = window.localStorage.getItem("mt_token");
          await fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              partnerId: profile.partner_id,
              message: `У ${profile.name} новое событие 🎉`
            })
          });
        } catch {
          /* non-fatal */
        }
      }

      return data;
    },
    [profile, refresh, notify]
  );

  const updateEvent = useCallback(
    async (id: string, patch: Partial<Pick<EventRow, "event_date" | "event_time" | "mood" | "comment">>) => {
      if (!clientRef.current) return;
      const { error } = await clientRef.current.from("events").update(patch).eq("id", id);
      if (error) throw error;
      notify("Запись обновлена", "success");
      void refresh();
    },
    [refresh, notify]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!clientRef.current) return;
      const { error } = await clientRef.current.from("events").delete().eq("id", id);
      if (error) throw error;
      haptic("warning");
      notify("Запись удалена", "neutral");
      void refresh();
    },
    [refresh, notify]
  );

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, "name" | "theme" | "notifications_enabled" | "notification_time" | "notify_partner_on_event">>) => {
      if (!clientRef.current || !profile) return;
      const { data, error } = await clientRef.current.from("users").update(patch).eq("id", profile.id).select().single();
      if (error) throw error;
      setProfile((data as Profile) ?? { ...profile, ...patch });
      if (patch.theme) applyThemeLocal(patch.theme);
      notify("Сохранено", "success");
    },
    [profile, notify]
  );

  const setActiveGoal = useCallback(
    async (days: GoalDays) => {
      if (!clientRef.current || !profile) return;
      const today = new Date();
      const startDate = today.toISOString().slice(0, 10);
      const { error } = await clientRef.current
        .from("goals")
        .insert({ user_id: profile.id, goal_days: days, start_date: startDate, status: "active" });
      if (error) throw error;
      haptic("success");
      notify(`Цель на ${days} дней установлена`, "success");
      void refresh();
      void backfillAchievements();
    },
    [profile, refresh, notify]
  );

  const cancelActiveGoal = useCallback(async () => {
    if (!clientRef.current || !profile) return;
    const { error } = await clientRef.current
      .from("goals")
      .update({ status: "cancelled" })
      .eq("user_id", profile.id)
      .eq("status", "active");
    if (error) throw error;
    notify("Цель отменена", "neutral");
    void refresh();
  }, [profile, refresh, notify]);

  const partnerConnect = useCallback(
    async (code: string) => {
      const token = window.localStorage.getItem("mt_token");
      const res = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "connect", code })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Не удалось подключиться");
      }
      notify("Партнёр подключён", "success");
      await refresh();
    },
    [refresh, notify]
  );

  const partnerDisconnect = useCallback(async () => {
    const token = window.localStorage.getItem("mt_token");
    const res = await fetch("/api/partner", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "disconnect" })
    });
    if (!res.ok) throw new Error("Ошибка отвязки");
    notify("Партнёр отвязан", "neutral");
    await refresh();
  }, [refresh, notify]);

  const backfillAchievements = useCallback(async () => {
    if (!clientRef.current || !profile) return;
    try {
      // Fetch quirks: compute streak from full client event list.
      // Longest streak maps to day_N achievements.
      const dates = events
        .map((e) => e.event_date)
        .filter(Boolean)
        .sort();
      const unique = Array.from(new Set(dates));
      let longest = unique.length ? 1 : 0;
      let run = 1;
      for (let i = 1; i < unique.length; i++) {
        const a = new Date(unique[i - 1] + "T00:00:00");
        const b = new Date(unique[i] + "T00:00:00");
        if (Math.round((b.getTime() - a.getTime()) / 86400000) === 1) {
          run += 1;
          longest = Math.max(longest, run);
        } else {
          run = 1;
        }
      }
      const unlockList: string[] = [];
      for (const a of ACHIEVEMENTS) {
        if (longest >= a.days) unlockList.push(a.code);
      }
      // Current active-day achievement covers single-day markers reachable from today.
      if (events.length && dates.length && dates[dates.length - 1] === new Date().toISOString().slice(0, 10)) {
        for (const a of ACHIEVEMENTS) if (a.days === 1) unlockList.push("day_1");
      }
      const client = clientRef.current;
      const owned = new Set(achievements.map((a) => a.code));
      const toInsert = unlockList.filter((c) => !owned.has(c)).map((code) => ({ user_id: profile.id, code }));
      if (toInsert.length) {
        await client.from("achievements").upsert(toInsert);
        void refresh();
      }
    } catch {
      /* non-fatal */
    }
  }, [profile, events, achievements, refresh]);

  const resetData = useCallback(() => {
    window.localStorage.removeItem("mt_token");
    clientRef.current = null;
    setProfile(null);
    setEvents([]);
    setGoals([]);
    setAchievements([]);
    setReady(false);
    setBooting(true);
    setAuthFailed(false);
    void boot();
  }, [boot]);

  const applyTheme = useCallback((t: Theme) => {
    applyThemeLocal(t);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      authFailed,
      booting,
      profile,
      events,
      goals,
      achievements,
      loading,
      toasts,
      notify,
      refresh,
      addEvent,
      updateEvent,
      deleteEvent,
      updateProfile,
      setActiveGoal,
      cancelActiveGoal,
      partnerConnect,
      partnerDisconnect,
      applyTheme,
      resetData
    }),
    [
      ready,
      authFailed,
      booting,
      profile,
      events,
      goals,
      achievements,
      loading,
      toasts,
      notify,
      refresh,
      addEvent,
      updateEvent,
      deleteEvent,
      updateProfile,
      setActiveGoal,
      cancelActiveGoal,
      partnerConnect,
      partnerDisconnect,
      applyTheme,
      resetData
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function applyThemeLocal(t: Theme): void {
  const root = document.documentElement;
  let applied: "light" | "dark" = "light";
  if (t === "auto") {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    applied = media.matches ? "dark" : "light";
  } else {
    applied = t;
  }
  root.classList.toggle("dark", applied === "dark");
  root.setAttribute("data-theme", applied);
  try {
    // Keep Telegram header in sync.
    const SDK = (window as unknown as { Telegram?: { WebApp?: { setHeaderColor?: (c: string) => void; setBackgroundColor?: (c: string) => void } } })
      .Telegram?.WebApp;
    SDK?.setHeaderColor?.(applied === "dark" ? "#0e1420" : "#f6f8fb");
    SDK?.setBackgroundColor?.(applied === "dark" ? "#0e1420" : "#f6f8fb");
  } catch {
    /* ignore */
  }
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}