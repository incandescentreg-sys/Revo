import { EventRow, StreakInfo } from "./types";
import { daysSince, keyFromDate } from "./dates";

/**
 * Pure stats engine. Everything is computed from the raw event list,
 * so the UI always recalculates after add / delete / update.
 */
export function computeStreaks(events: EventRow[], now = new Date()): StreakInfo {
  const dates = events
    .map((e) => e.event_date)
    .filter(Boolean)
    .sort();

  const unique = Array.from(new Set(dates));

  if (unique.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastEventDate: null, daysSinceLast: null };
  }

  const last = unique[unique.length - 1];

  // Longest streak: consecutive-day runs among unique event dates.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1] + "T00:00:00");
    const cur = new Date(unique[i] + "T00:00:00");
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak: consecutive days ending at the last event (or today if
  // the last event was today, streak continues).
  let current = 1;
  for (let i = unique.length - 1; i > 0; i--) {
    const prev = new Date(unique[i - 1] + "T00:00:00");
    const cur = new Date(unique[i] + "T00:00:00");
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) current += 1;
    else break;
  }

  return {
    currentStreak: current,
    longestStreak: longest,
    lastEventDate: last,
    daysSinceLast: daysSince(last, now)
  };
}

/** Average gap in days between consecutive events. */
export function averageGapDays(events: EventRow[]): number | null {
  const dates = events.map((e) => e.event_date).filter(Boolean).sort();
  if (dates.length < 2) return null;
  let total = 0;
  for (let i = 1; i < dates.length; i++) {
    const a = new Date(dates[i - 1] + "T00:00:00");
    const b = new Date(dates[i] + "T00:00:00");
    total += Math.round((b.getTime() - a.getTime()) / 86400000);
  }
  return total / (dates.length - 1);
}

export function eventsInRange(events: EventRow[], start: string, end: string): EventRow[] {
  return events.filter((e) => e.event_date >= start && e.event_date <= end);
}

/** Group events by day key to power the calendar. */
export function groupByDay(events: EventRow[]): Map<string, EventRow[]> {
  const map = new Map<string, EventRow[]>();
  for (const e of events) {
    const list = map.get(e.event_date) ?? [];
    list.push(e);
    map.set(e.event_date, list);
  }
  return map;
}