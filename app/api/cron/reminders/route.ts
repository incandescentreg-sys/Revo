import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { sendTelegramMessage } from "@/lib/telegram-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

/**
 * Daily scheduled reminder pushed to users who enabled notifications
 * and linked their bot. Called by Vercel Cron via /api/cron/reminders.
 * In the reminder text we NEVER include personal statistics.
 */
export async function GET(req: NextRequest) {
  if (CRON_SECRET && req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    // Vercel Cron sends x-vercel-cron secret via authorization if configured.
    if (req.headers.get("x-vercel-cron") !== "1") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const service = createServiceClient();
  const { data: users } = await service
    .from("users")
    .select("*")
    .eq("notifications_enabled", true)
    .not("chat_id", "is", null)
    .limit(500);

  let sent = 0;
  for (const u of users ?? []) {
    const ok = await sendTelegramMessage(
      u.chat_id,
      "🔔 Сегодня — хороший день продолжить курс. Ты справишься! 💪",
      { disable_notification: false }
    );
    if (ok) {
      sent++;
      await service.from("notifications").insert({
        user_id: u.id,
        type: "reminder",
        payload: { source: "cron" },
        sent_to_telegram: true
      });
    }
  }

  return NextResponse.json({ ok: true, sent });
}