import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateInitData, getDevTelegramUser, TelegramUser } from "@/lib/telegram";
import { signUserToken } from "@/lib/jwt";

interface AuthBody {
  initData?: string;
  dev?: boolean;
  telegramUser?: TelegramUser;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AuthBody;
    const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
    const service = createServiceClient();

    let telegramUser: TelegramUser | null = null;

    // 1) Validate Telegram initData (HMAC) unless in dev mode.
    if (body.dev && !body.initData) {
      // Developer preview: allow manual Telegram ID from env.
      telegramUser = getDevTelegramUser();
    } else if (botToken) {
      const parsed = validateInitData(body.initData ?? "", botToken);
      if (!parsed) {
        return NextResponse.json({ error: "Invalid initData signature" }, { status: 401 });
      }
      telegramUser = parsed.user ?? null;
      if (!telegramUser) {
        return NextResponse.json({ error: "No Telegram user in initData" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
    }

    const telegramId = Number(telegramUser.id);

    // 2) Upsert the user (server-side, service role bypasses RLS).
    const name = [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ") || "Пользователь";

    const { data: existing } = await service
      .from("users")
      .select("id, name")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    let userId: string;
    if (existing) {
      userId = existing.id;
      if (existing.name !== name && name !== "Пользователь") {
        await service.from("users").update({ name }).eq("id", userId);
      }
    } else {
      const { data: created, error } = await service
        .from("users")
        .insert({ telegram_id: telegramId, name })
        .select("id")
        .single();
      if (error) throw error;
      userId = created.id;
    }

    // 3) Mint a Supabase-trusted JWT so RLS equates auth.uid() to this user.
    const token = await signUserToken(userId);

    // 4) Return the token + fresh profile for the client context.
    const { data: profile } = await service.from("users").select("*").eq("id", userId).single();

    return NextResponse.json({ token, profile });
  } catch (err) {
    console.error("/api/auth error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}