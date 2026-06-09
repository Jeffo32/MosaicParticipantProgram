// GET (Vercel Cron, nightly)
// Sends each participant a night-before SMS of tomorrow's sessions.
// Protected by CRON_SECRET. No-op for SMS if Twilio isn't configured,
// but still logs what WOULD be sent so you can sanity-check copy.
import { admin, logNotification } from "./_supabase.js";
import { sendSms, smsConfigured } from "./_send.js";

const BLOCKS = { 1: "9am – 12pm", 2: "12pm – 3pm", 3: "3pm – 6pm", 4: "6pm – 9pm" };

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function buildMessage(name, rows) {
  const lines = rows.map((r) => {
    const when = BLOCKS[r.activities?.start_block] || "";
    let s = `• ${r.activities?.name} (${when})`;
    if (r.activities?.bring_money_amount) s += ` — bring $${r.activities.bring_money_amount} (Mosaic doesn't pay for client lunches)`;
    return s;
  });
  return `Hi ${name || "there"} 👋 Tomorrow at Mosaic:\n${lines.join("\n")}`;
}

export default async function handler(req, res) {
  // auth: Vercel Cron sends Authorization: Bearer <CRON_SECRET> when set
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const got = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (got !== secret) return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const sb = admin();
    const date = tomorrowIso();
    const r = await sb
      .from("bookings")
      .select("participant_id, status, profiles!bookings_participant_id_fkey(display_name, phone), activities(name, start_block, bring_money_amount)")
      .eq("date", date)
      .in("status", ["pending", "confirmed"]);
    if (r.error) return res.status(500).json({ error: r.error.message });

    // group by participant
    const byP = {};
    for (const row of r.data) {
      (byP[row.participant_id] = byP[row.participant_id] || { name: row.profiles?.display_name, phone: row.profiles?.phone, rows: [] }).rows.push(row);
    }

    const out = [];
    for (const pid of Object.keys(byP)) {
      const p = byP[pid];
      const msg = buildMessage(p.name, p.rows);
      let result = { skipped: true };
      if (smsConfigured() && p.phone) result = await sendSms(p.phone, msg).catch((e) => ({ error: e.message }));
      await logNotification(sb, "night_before_sms", { participant: p.name, phone: p.phone, message: msg, result }, result.ok ? "sent" : "preview");
      out.push({ participant: p.name, sent: !!result.ok, preview: msg });
    }

    return res.status(200).json({ date, count: out.length, smsConfigured: smsConfigured(), reminders: out });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
