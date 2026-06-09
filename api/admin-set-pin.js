// POST { id, pin }   (Authorization: Bearer <staff JWT>)
// Staff-only: reset a participant's PIN. Verifies the caller is staff and
// that they're allowed to touch this participant (admins anyone; workers
// only their assigned participants), then sets the PIN via the security-
// definer RPC using the service role.
import { admin, readJson } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const sb = admin();

    const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return res.status(401).json({ error: "Not signed in." });
    const who = await sb.auth.getUser(jwt);
    if (who.error || !who.data?.user) return res.status(401).json({ error: "Invalid session." });
    const callerId = who.data.user.id;
    const me = await sb.from("profiles").select("role").eq("id", callerId).single();
    if (me.error || !["admin", "manager", "worker"].includes(me.data?.role)) {
      return res.status(403).json({ error: "Staff only." });
    }

    const { id, pin } = await readJson(req);
    if (!id || !pin) return res.status(400).json({ error: "Participant and PIN are required." });
    if (String(pin).length < 4) return res.status(400).json({ error: "PIN must be at least 4 digits." });

    // Workers may only reset PINs for participants assigned to them.
    if (me.data.role === "worker") {
      const a = await sb.from("assignments").select("id").eq("worker_id", callerId).eq("participant_id", id).limit(1);
      if (a.error || !a.data.length) return res.status(403).json({ error: "That participant isn't assigned to you." });
    }

    const r = await sb.rpc("set_participant_pin", { p_id: id, p_pin: String(pin).trim() });
    if (r.error) return res.status(500).json({ error: r.error.message });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error." });
  }
}
