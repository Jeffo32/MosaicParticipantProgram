// POST { id }   (Authorization: Bearer <staff JWT>)
// Staff-only. Deletes a participant's auth user, which cascades their
// profile, participant row, bookings, messages, away periods and
// service requests (all FKs are ON DELETE CASCADE).
import { admin, readJson } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const sb = admin();

    // authorise caller as admin/manager
    const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return res.status(401).json({ error: "Not signed in." });
    const who = await sb.auth.getUser(jwt);
    if (who.error || !who.data?.user) return res.status(401).json({ error: "Invalid session." });
    const me = await sb.from("profiles").select("role").eq("id", who.data.user.id).single();
    if (me.error || !["admin", "manager"].includes(me.data?.role)) {
      return res.status(403).json({ error: "Admin only." });
    }

    const { id } = await readJson(req);
    if (!id) return res.status(400).json({ error: "Missing participant id." });
    if (id === who.data.user.id) return res.status(400).json({ error: "You can't delete your own account here." });

    // Confirm the target is actually a participant (don't let staff be deleted here).
    const target = await sb.from("profiles").select("role, display_name").eq("id", id).single();
    if (target.error) return res.status(404).json({ error: "Participant not found." });
    if (target.data.role !== "participant") return res.status(400).json({ error: "That account is not a participant." });

    const del = await sb.auth.admin.deleteUser(id);
    if (del.error) return res.status(500).json({ error: del.error.message });

    return res.status(200).json({ ok: true, deleted: target.data.display_name });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error." });
  }
}
