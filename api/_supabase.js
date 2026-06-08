// Shared server-side Supabase admin client (service role).
// Used ONLY by /api functions — never shipped to the browser.
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function admin() {
  if (!URL || !SERVICE_KEY) {
    throw new Error("Server not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel env.");
  }
  return createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

export const PARTICIPANT_EMAIL_DOMAIN =
  process.env.PARTICIPANT_EMAIL_DOMAIN || "participants.mosaic.local";

export function participantEmail(accessCode) {
  return `p-${String(accessCode).toLowerCase().replace(/[^a-z0-9]/g, "")}@${PARTICIPANT_EMAIL_DOMAIN}`;
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return await new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

// Best-effort write to notifications_log; never throws.
export async function logNotification(sb, channel, payload, status) {
  try { await sb.from("notifications_log").insert({ channel, payload, status }); } catch {}
}
