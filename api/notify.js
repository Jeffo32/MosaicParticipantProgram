// POST { kind, payload }
// Best-effort staff notification when a participant raises a service
// request or sends a message. Always returns 200 — notifications must
// never break the participant's flow. The admin dashboard is the
// primary, always-on channel; SMS/email here is an extra.
import { admin, logNotification } from "./_supabase.js";
import { sendSms, sendEmail, smsConfigured, emailConfigured } from "./_send.js";

const COPY = {
  service_request: (p) => `Mosaic: ${p.participant || "A participant"} needs help — "${p.type}"${p.detail ? `: ${p.detail}` : ""}. Open the dashboard.`,
  message: (p) => `Mosaic: new message from ${p.participant || "a participant"} — "${(p.text || "").slice(0, 120)}"`,
  staff_reply: () => null, // staff -> participant reply; participant push handled separately
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(200).json({ ok: true, skipped: "method" });
    let body = req.body;
    if (!body || typeof body !== "object") {
      body = await new Promise((r) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => { try { r(JSON.parse(s || "{}")); } catch { r({}); } }); });
    }
    const { kind, payload = {} } = body;
    const text = (COPY[kind] || (() => null))(payload);
    if (!text) return res.status(200).json({ ok: true, skipped: "no-copy" });

    const results = {};
    if (smsConfigured() && process.env.STAFF_NOTIFY_PHONE) {
      results.sms = await sendSms(process.env.STAFF_NOTIFY_PHONE, text).catch((e) => ({ error: e.message }));
    }
    if (emailConfigured()) {
      results.email = await sendEmail("Mosaic — action needed", `<p>${text}</p>`).catch((e) => ({ error: e.message }));
    }

    try { await logNotification(admin(), "staff_notify", { kind, text, results }, "sent"); } catch {}
    return res.status(200).json({ ok: true, results });
  } catch (e) {
    return res.status(200).json({ ok: true, error: e.message });
  }
}
