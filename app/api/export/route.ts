import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exports the authenticated user's full private dataset as JSON or CSV.
 * GET /api/export?format=json|csv
 */
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const format = new URL(req.url).searchParams.get("format") ?? "json";

  const [eventsRes, goalsRes, achievementsRes] = await Promise.all([
    service.from("events").select("*").eq("user_id", userId).order("event_date", { ascending: true }),
    service.from("goals").select("*").eq("user_id", userId),
    service.from("achievements").select("*").eq("user_id", userId)
  ]);

  const exportedAt = new Date().toISOString();
  const payload = {
    exportedAt,
    events: eventsRes.data ?? [],
    goals: goalsRes.data ?? [],
    achievements: achievementsRes.data ?? []
  };

  if (format === "csv") {
    const rows = (payload.events as { event_date: string; event_time: string; mood: string | null; comment: string | null }[]).map(
      (e) => [e.event_date, e.event_time?.slice(0, 5) ?? "", e.mood ?? "", (e.comment ?? "").replace(/;/g, ",").replace(/"/g, "'")]
    );
    const csv = ["date;time;mood;comment", ...rows.map((r) => r.join(";"))].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="momentum-export.csv"'
      }
    });
  }

  return NextResponse.json(payload, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="momentum-export.json"'
    }
  });
}