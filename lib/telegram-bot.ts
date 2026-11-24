/**
 * Minimal Telegram Bot API client used only server-side.
 */
const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN ?? "";

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  opts: { parse_mode?: "HTML" | "MarkdownV2"; disable_notification?: boolean } = {}
): Promise<boolean> {
  const token = BOT_TOKEN();
  if (!token) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: opts.parse_mode ?? "HTML",
        disable_notification: opts.disable_notification ?? false
      })
    });
    const json = await res.json();
    return !!json?.ok;
  } catch (err) {
    console.error("Telegram send failed", err);
    return false;
  }
}

/** Fetches the bot info to confirm the token is valid. */
export async function getBotInfo(): Promise<{ username?: string } | null> {
  const token = BOT_TOKEN();
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const json = await res.json();
    if (!json?.ok) return null;
    return { username: json.result.username };
  } catch {
    return null;
  }
}