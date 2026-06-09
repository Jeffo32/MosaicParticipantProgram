// POST { name, pin }
// Participants log in with their NAME + PIN. The PIN is verified with the
// service role (access_code is stored as the lower-cased display name), then
// exchanged for a one-time magic-link OTP the browser swaps for a real,
// RLS-scoped session. The PIN never reaches the browser-side client.
import { admin, readJson } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { name, pin } = await readJson(req);
    if (!name || !pin) return res.status(400).json({ error: "Name and PIN are required." });

    const sb = admin();
    const code = String(name).trim().toLowerCase();

    // 1. Verify name + PIN -> participant uuid
    const v = await sb.rpc("verify_participant_pin", { p_code: code, p_pin: String(pin).trim() });
    if (v.error) return res.status(500).json({ error: "Login check failed." });
    if (!v.data) return res.status(401).json({ error: "Wrong name or PIN." });

    // 2. Find that participant's auth email, then mint a one-time OTP
    const u = await sb.auth.admin.getUserById(v.data);
    const email = u.data?.user?.email;
    if (u.error || !email) return res.status(500).json({ error: "Could not start session." });

    const link = await sb.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error || !link.data?.properties?.email_otp) {
      return res.status(500).json({ error: "Could not start session." });
    }

    return res.status(200).json({ email, token: link.data.properties.email_otp });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error." });
  }
}
