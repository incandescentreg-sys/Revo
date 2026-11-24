import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { sendTelegramMessage } from "@/lib/telegram-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Telegram Bot webhook.
 *
 * Flow: user taps "Связать бота (нажми Start)" in the app → opens
 * t.me/<bot>?start=<base64(userId)> → Telegram sends a /start<code>
 * message here → we find the user and store their chat_id so the app
 * can push reminders.
 *
 * Point the bot at this endpoint:
 *   curl -F "url=<APP_URL>/api/webhook" "https://api.telegram.org/bot<TOKEN>/setWebhook"
 */
export async function POST(req: NextRequest) {
  const service = createServiceClient();
  try {
    const update = await req.json();
    const message = update?.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const text: string = message.text;
    const chatId: number | string = message.chat?.id;

    // Support both "/start CODE" and "/start  CODE" payload forms.
    const m = text.match(/^\/start(?:\s+(.+))?$/);
    if (m) {
      const code = (m[1] ?? "").trim();
      if (code) {
        try {
          const userId = Buffer.from(code, "base64").toString("utf8");
          const { data: user } = await service.from("users").select("id").eq("id", userId).maybeSingle();
          if (user) {
            await service.from("users").update({ chat_id: String(chatId) }).eq("id", userId);
            await sendTelegramMessage(chatId, "✅ Бот связан с твоим аккаунтом! Напоминания включены.");
            return NextResponse.json({ ok: true });
          }
        } catch {
          /* invalid code */
        }
        await sendTelegramMessage(chatId, "Не удалось распознать код. Открой ссылку из приложения ещё раз.");
        return NextResponse.json({ ok: true });
      }
    }

    // Plain "start" without a code: offer to open the app.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await sendTelegramMessage(
      chatId,
      `Привет! Открой приложение прямо в этом чате: ${appUrl}\n\nРаботает только как Telegram Mini App.`
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}