import { format, parseISO, startOfDay, differenceInCalendarDays, subDays, isBefore, addDays } from "date-fns";

export function todayKey(base = new Date()): string {
  return format(base, "yyyy-MM-dd");
}

export function keyFromDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function toLocalKey(iso: string): Date {
  return parseISO(`${iso.slice(0, 10)}T00:00:00`);
}

/** Number of whole clear days since a given local date (>=0). */
export function daysSince(dateKey: string, base = new Date()): number {
  const d = toLocalKey(dateKey);
  return Math.max(0, differenceInCalendarDays(startOfDay(base), d));
}

export function monthLabel(d: Date, locale: "ru" | "en" = "ru"): string {
  if (locale === "en") return format(d, "MMMM yyyy");
  return format(d, "LLLL yyyy");
}

export function weekdayShort(d: Date): string {
  return format(d, "EEEEE"); // single-letter day
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function formatDateHuman(isoDate: string): string {
  const d = toLocalKey(isoDate);
  return format(d, "dd MMMM yyyy");
}

/**
 * Builds a rectangular calendar grid (weeks) for a month, 0-based month index.
 * Cells before/after the month range are null (greyed out).
 */
export function buildMonthGrid(year: number, monthIndex: number): (Date | null)[] {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const lead = first.getDay(); // 0 = Sunday
  const totalCells = Math.ceil((lead + daysInMonth) / 7) * 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - lead + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null);
    } else {
      cells.push(new Date(year, monthIndex, dayNum));
    }
  }
  return cells;
}

export function isFuture(d: Date, base: Date): boolean {
  return isBefore(startOfDay(base), startOfDay(d));
}

export function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  return subDays(startOfDay(d), diff);
}

export function addDaysSafe(d: Date, n: number): Date {
  return addDays(d, n);
}

export function toLocalISO(d: Date): string {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}