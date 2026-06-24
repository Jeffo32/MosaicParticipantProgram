// POST { endpoint, p256dh, auth }   (Authorization: Bearer <staff JWT>)
// Stores a staff member's Web Push subscription so /api/notify can alert them.
import { admin, readJson } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const sb = admin();

    const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return res.status(401).json({ error: "Not signed in." });
    const who = await sb.auth.getUser(jwt);
    if (who.error || !who.data?.user) return res.status(401).json({ error: "Invalid session." });
    const uid = who.data.user.id;

    const me = await sb.from("profiles").select("role").eq("id", uid).single();
    if (me.error || !["admin", "manager", "worker"].includes(me.data?.role)) {
      return res.status(403).json({ error: "Staff only." });
    }

    const { endpoint, p256dh, auth } = await readJson(req);
    if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: "Invalid subscription." });

    // Upsert by endpoint (one row per device); re-bind it to the current user.
    const up = await sb.from("push_subscriptions")
      .upsert({ user_id: uid, endpoint, p256dh, auth }, { onConflict: "endpoint" });
    if (up.error) return res.status(500).json({ error: up.error.message });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error." });
  }
}
