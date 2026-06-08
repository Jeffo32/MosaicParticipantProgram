// POST { name, phone?, accessCode, pin, mode? }   (Authorization: Bearer <staff JWT>)
// Staff-only. Provisions a participant end-to-end:
//   auth user (synthetic email) -> profile (role=participant) ->
//   participant row (access_code + hashed PIN + mode).
import { admin, participantEmail, readJson } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const sb = admin();

    // ---- authorise caller as staff ----
    const authHeader = req.headers.authorization || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return res.status(401).json({ error: "Not signed in." });
    const who = await sb.auth.getUser(jwt);
    if (who.error || !who.data?.user) return res.status(401).json({ error: "Invalid session." });
    const me = await sb.from("profiles").select("role").eq("id", who.data.user.id).single();
    if (me.error || !["admin", "manager"].includes(me.data?.role)) {
      return res.status(403).json({ error: "Admin only." });
    }

    // ---- validate payload ----
    const { name, phone, accessCode, pin, mode } = await readJson(req);
    if (!name || !accessCode || !pin) return res.status(400).json({ error: "name, accessCode and pin are required." });
    if (String(pin).length < 4) return res.status(400).json({ error: "PIN must be at least 4 digits." });
    const cleanCode = String(accessCode).trim();

    // ---- uniqueness check on access_code ----
    const dupe = await sb.from("participants").select("id").eq("access_code", cleanCode).maybeSingle();
    if (dupe.data) return res.status(409).json({ error: "That access code is already in use." });

    // ---- create auth user ----
    const email = participantEmail(cleanCode);
    const created = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: name, role: "participant" },
    });
    if (created.error) return res.status(500).json({ error: created.error.message });
    const uid = created.data.user.id;

    // ---- profile + participant rows ----
    const p1 = await sb.from("profiles").upsert({
      id: uid, role: "participant", display_name: name, phone: phone || null, mode: mode || "both",
    });
    if (p1.error) return res.status(500).json({ error: p1.error.message });

    const p2 = await sb.from("participants").upsert({ id: uid, access_code: cleanCode });
    if (p2.error) return res.status(500).json({ error: p2.error.message });

    const p3 = await sb.rpc("set_participant_pin", { p_id: uid, p_pin: String(pin).trim() });
    if (p3.error) return res.status(500).json({ error: p3.error.message });

    return res.status(200).json({ id: uid, accessCode: cleanCode, name });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error." });
  }
}
