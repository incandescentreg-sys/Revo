import { SignJWT, jwtVerify } from "jose";

/**
 * We mint a custom Supabase-compatible JWT for the Telegram-authenticated
 * user. The `sub` claim equals the user's uuid (users.id), `role` is
 * "authenticated", and the token is signed with the Supabase JWT secret.
 * Supabase then trusts it exactly like a first-party login, which powers
 * Row Level Security through auth.uid() = sub.
 */
export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("Missing SUPABASE_JWT_SECRET");
  return new TextEncoder().encode(secret);
}

export async function signUserToken(userId: string, expiresIn = "90d"): Promise<string> {
  const secret = getJwtSecretKey();
  return new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer("revo-tracker")
    .sign(secret);
}

export async function verifyUserToken(token: string): Promise<string | null> {
  try {
    const secret = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      issuer: "revo-tracker"
    });
    if (!payload.sub) return null;
    return payload.sub as string;
  } catch {
    return null;
  }
}