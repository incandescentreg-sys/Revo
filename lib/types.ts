export type Theme = "light" | "dark" | "auto";

export const MOODS = ["😕", "😐", "🙂", "😌", "😴", "😞", "😤", "🤒"] as const;
export type Mood = (typeof MOODS)[number];

export const GOAL_DAYS = [7, 14, 30, 60, 90] as const;
export type GoalDays = (typeof GOAL_DAYS)[number];

export interface Profile {
  id: string;
  telegram_id: number;
  name: string;
  theme: Theme;
  notifications_enabled: boolean;
  notification_time: string;
  chat_id: string | null;
  partner_id: string | null;
  notify_partner_on_event: boolean;
  created_at: string;
}

export interface EventRow {
  id: string;
  user_id: string;
  event_date: string; // YYYY-MM-DD local
  event_time: string; // HH:mm:ss local
  mood: string | null;
  comment: string | null;
  created_at: string;
}

export interface GoalRow {
  id: string;
  user_id: string;
  goal_days: GoalDays;
  start_date: string; // YYYY-MM-DD local
  status: "active" | "completed" | "failed" | "cancelled";
  completed_at: string | null;
  created_at: string;
}

export interface AchievementRow {
  id: string;
  user_id: string;
  code: string;
  unlocked_at: string;
}

export interface DayInfo {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  events: EventRow[];
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastEventDate: string | null;
  daysSinceLast: number | null;
}

export interface AchievementMeta {
  code: string;
  days: number;
  title: string;
  icon: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementMeta[] = [
  { code: "day_1", days: 1, title: "Первый день", icon: "🌱", description: "Ты сделал первый шаг" },
  { code: "day_3", days: 3, title: "Три дня", icon: "🌿", description: "Начало положено" },
  { code: "day_7", days: 7, title: "Неделя", icon: "🌳", description: "Целая неделя силы воли" },
  { code: "day_14", days: 14, title: "Две недели", icon: "🔥", description: "Отличный темп" },
  { code: "day_30", days: 30, title: "Месяц", icon: "🏆", description: "Месяц контроля над собой" },
  { code: "day_60", days: 60, title: "Два месяца", icon: "🥇", description: "Серьёзное достижение" },
  { code: "day_90", days: 90, title: "Три месяца", icon: "👑", description: "Выдающийся результат!" }
];

export const MOTIVATION = [
  "Каждый день воздержания — это инвестиция в себя.",
  "Дисциплина побеждает мотивацию. Продолжай.",
  "Ты сильнее своих импульсов.",
  "Маленькие шаги приводят к большой силе.",
  "Сфокусированное внимание — твоё супероружие.",
  "Сегодня ещё один день твоей победы.",
  "Сила воли растёт как мышца — тренируй её.",
  "Не ломай цепочку. Ты уже далеко зашёл.",
  "Контроль над собой = свобода.",
  "Твоя энергия — твой ресурс. Береги его."
] as const;