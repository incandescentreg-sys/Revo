import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NotifyBody {
  message: string;
  partnerId?: string;
}

/**
 * Sends a private Telegram reminder to the authenticated user's chat.
 * Optional partnerId: instead sends a message to the partner's chat, but ONLY
 * if the calling user has opted in (notify_partner_on_event) and the partner
 * has linked the bot (has a chat_id). Used for "У {NAME} новое событие".
 */
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: NotifyBody = { message: "Напоминание о твоей цели 💪" };
  try {
    body = (await req.json()) as NotifyBody;
  } catch {
    /* default body */
  }

  const service = createServiceClient();
  const { data: user } = await service.from("users").select("*").eq("id", userId).single();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const message = body.message.slice(0, 1024);

  // --- Notify partner branch ---
  if (body.partnerId) {
    if (!user.notify_partner_on_event) {
      return NextResponse.json({ ok: false, reason: "partner_notify_off" });
    }
    const { data: partner } = await service.from("users").select("chat_id").eq("id", body.partnerId).maybeSingle();
    if (!partner?.chat_id) {
      return NextResponse.json({ ok: false, reason: "partner_no_chat_id" });
    }
    const sent = await sendTelegramMessage(partner.chat_id, message);
    if (sent) {
      await service.from("notifications").insert({
        user_id: userId,
        type: "partner",
        payload: { to: body.partnerId, text: message },
        sent_to_telegram: true
      });
    }
    return NextResponse.json({ ok: sent });
  }

  // --- Self notification branch ---
  if (!user.notifications_enabled) {
    return NextResponse.json({ ok: false, reason: "notifications_disabled" });
  }

  if (!user.chat_id) {
    return NextResponse.json({ ok: false, reason: "no_chat_id" });
  }

  const sent = await sendTelegramMessage(user.chat_id, message);

  if (sent) {
    await service.from("notifications").insert({
      user_id: userId,
      type: "reminder",
      payload: { text: message },
      sent_to_telegram: true
    });
  }

  return NextResponse.json({ ok: sent });
}

/**
 * Test endpoint: pings the bot and reports whether a user chat exists.
 */
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: user } = await service.from("users").select("*").eq("id", userId).single();

  return NextResponse.json({
    notifications_enabled: user?.notifications_enabled ?? false,
    has_chat_id: !!user?.chat_id
  });
}