// Optional delivery helpers. Each is a graceful no-op when its
// provider env vars are absent, so the app works with zero config
// and "lights up" SMS/email the moment you add credentials.

export function smsConfigured() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

export async function sendSms(to, body) {
  if (!smsConfigured() || !to) return { skipped: true };
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const form = new URLSearchParams({ From: process.env.TWILIO_FROM, To: to, Body: body });
  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const json = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, sid: json.sid, error: json.message };
}

export function emailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.STAFF_NOTIFY_EMAIL);
}

export async function sendEmail(subject, html) {
  if (!emailConfigured()) return { skipped: true };
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Mosaic <onboarding@resend.dev>",
      to: process.env.STAFF_NOTIFY_EMAIL,
      subject,
      html,
    }),
  });
  const json = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, id: json.id, error: json.message };
}
