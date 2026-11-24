import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Partner linking.
 *
 *  POST { action: "connect", code }  — connect to a user by their id (code).
 *  POST { action: "disconnect" }     — remove the mutual link.
 *  GET                              — return the connected partner's public profile.
 *
 * Connection is MUTUAL: both users' partner_id are set at the same time,
 * so reading partner data is always consensual. You cannot connect to yourself.
 */
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: string; code?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }

  const service = createServiceClient();
  const { data: me } = await service.from("users").select("id, partner_id").eq("id", userId).single();
  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const action = body.action ?? "";

  if (action === "connect") {
    const code = (body.code ?? "").trim();
    if (!code) return NextResponse.json({ error: "Нужен код партнёра" }, { status: 400 });
    if (code === userId) return NextResponse.json({ error: "Нельзя подключиться к себе" }, { status: 400 });

    const { data: partner } = await service.from("users").select("id").eq("id", code).maybeSingle();
    if (!partner) return NextResponse.json({ error: "Партнёр не найден" }, { status: 404 });

    if (me.partner_id && me.partner_id !== code) {
      return NextResponse.json({ error: "Сначала отвяжи текущего партнёра" }, { status: 409 });
    }

    // Mutual link
    await service.from("users").update({ partner_id: code }).eq("id", userId);
    await service.from("users").update({ partner_id: userId }).eq("id", code);

    return NextResponse.json({ ok: true, partner_id: code });
  }

  if (action === "disconnect") {
    const theirId = me.partner_id;
    if (theirId) {
      await service.from("users").update({ partner_id: null }).eq("id", userId);
      await service.from("users").update({ partner_id: null }).eq("id", theirId);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: me } = await service.from("users").select("partner_id").eq("id", userId).single();
  if (!me?.partner_id) return NextResponse.json({ partner: null });

  const { data: partner } = await service
    .from("users")
    .select("id, telegram_id, name, created_at, partner_id")
    .eq("id", me.partner_id)
    .single();

  return NextResponse.json({ partner: partner ?? null });
}