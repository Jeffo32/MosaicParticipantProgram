// POST { kind, payload }
// Best-effort staff notification when a participant raises a service
// request or sends a message. Always returns 200 — notifications must
// never break the participant's flow. The admin dashboard is the
// primary, always-on channel; SMS/email here is an extra.
import { admin, logNotification } from "./_supabase.js";
import { sendSms, sendEmail, smsConfigured, emailConfigured } from "./_send.js";
import webpush from "web-push";

const COPY = {
  service_request: (p) => `Mosaic: ${p.participant || "A participant"} needs help — "${p.type}"${p.detail ? `: ${p.detail}` : ""}. Open the dashboard.`,
  message: (p) => `Mosaic: new message from ${p.participant || "a participant"} — "${(p.text || "").slice(0, 120)}"`,
  away: (p) => `Mosaic: ${p.participant || "A participant"} will be away ${p.start}${p.end && p.end !== p.start ? ` to ${p.end}` : ""}${p.note ? ` (${p.note})` : ""}.`,
  staff_reply: () => null, // staff -> participant reply; participant push handled separately
};

// Clean copy for the push banner — the device already shows the app name ("Mosaic"),
// so don't repeat it. Title = who/what, body = the detail.
const PUSH = {
  message: (p) => ({ title: p.participant || "New message", body: (p.text || "sent a message").slice(0, 140) }),
  service_request: (p) => ({ title: `${p.participant || "A participant"} needs help`, body: `${p.type || "Help request"}${p.detail ? `: ${p.detail}` : ""}` }),
  away: (p) => ({ title: `${p.participant || "A participant"} will be away`, body: `${p.start || ""}${p.end && p.end !== p.start ? ` → ${p.end}` : ""}${p.note ? ` (${p.note})` : ""}`.trim() }),
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

    // Web push to every admin/manager — the "never missed" channel.
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      try {
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || "mailto:jeffo.productions@gmail.com",
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        const sb = admin();
        const ad = await sb.from("profiles").select("id").in("role", ["admin", "manager"]);
        const ids = (ad.data || []).map((r) => r.id);
        if (ids.length) {
          const subs = await sb.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", ids);
          const pc = (PUSH[kind] || (() => ({ title: "Mosaic", body: text })))(payload);
          const pushData = JSON.stringify({ title: pc.title, body: pc.body, url: "/admin" });
          results.push = await Promise.all((subs.data || []).map((s) =>
            webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, pushData)
              .then(() => ({ ok: true }))
              .catch(async (err) => {
                // Prune dead subscriptions so the table stays clean.
                if (err.statusCode === 404 || err.statusCode === 410) {
                  try { await sb.from("push_subscriptions").delete().eq("id", s.id); } catch {}
                }
                return { error: err.statusCode || err.message };
              })
          ));
        }
      } catch (e) { results.pushError = e.message; }
    }

    try { await logNotification(admin(), "staff_notify", { kind, text, results }, "sent"); } catch {}
    return res.status(200).json({ ok: true, results });
  } catch (e) {
    return res.status(200).json({ ok: true, error: e.message });
  }
}
