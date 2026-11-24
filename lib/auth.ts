import { NextRequest } from "next/server";
import { verifyUserToken } from "./jwt";

/**
 * Resolves the authenticated user id from the Authorization header.
 * Returns null when missing or invalid.
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  return verifyUserToken(token);
}