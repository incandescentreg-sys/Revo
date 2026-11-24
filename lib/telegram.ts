import crypto from "crypto";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
}

export interface ParsedInitData {
  user?: TelegramUser;
  raw: string;
  auth_date: number;
  hash: string;
}

/**
 * Splits the raw initData query string into field/value pairs.
 * The `hash` field must be excluded from the canonical string.
 */
function parseInitData(initData: string): ParsedInitData {
  const params = new URLSearchParams(initData);

  let user: TelegramUser | undefined;
  const userRaw = params.get("user");
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as TelegramUser;
    } catch {
      user = undefined;
    }
  }

  return {
    user,
    raw: initData,
    auth_date: Number(params.get("auth_date") ?? 0),
    hash: params.get("hash") ?? ""
  };
}

/**
 * Performs the official Telegram Web App HMAC validation:
 *  - bot_token → SHA256
 *  - secret key = HMAC_SHA256("WebAppData", token_hash)
 *  - data = all fields except `hash` sorted by key, joined as k=v lines
 *  - result = HMAC_SHA256(secret, data)
 *  - valid iff result hex === provided hash AND auth_date not too old.
 */
export function validateInitData(initData: string, botToken: string, maxAgeSec = 86400): ParsedInitData | null {
  if (!initData || !botToken) return null;

  const parsed = parseInitData(initData);
  if (!parsed.hash) return null;

  const secretKey = crypto
    .createHash("sha256")
    .update(botToken)
    .digest();

  const hmacKey = crypto.createHmac("sha256", secretKey).update("WebAppData").digest();

  // Rebuild canonical string: sort all pairs except `hash` by key name.
  const params = new URLSearchParams(initData);
  const dataCheckArr: string[] = [];
  params.forEach((value, key) => {
    if (key === "hash") return;
    dataCheckArr.push(`${key}=${value}`);
  });
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join("\n");

  const computed = crypto
    .createHmac("sha256", hmacKey)
    .update(dataCheckString)
    .digest("hex");

  if (computed !== parsed.hash) return null;

  // Anti-replay: reject initData older than the allowed window.
  if (parsed.auth_date && Date.now() / 1000 - parsed.auth_date > maxAgeSec) {
    return null;
  }

  return parsed;
}

/**
 * Developer fallback: when running in a plain browser (not inside
 * Telegram) we let the user pick a manual Telegram ID so local dev works.
 */
export function getDevTelegramUser(): TelegramUser {
  const id = Number(process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID) || 123456789;
  return { id, first_name: "Dev", username: "dev_user" };
}