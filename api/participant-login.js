// POST { accessCode, pin }
// Verifies the participant's PIN with the service role, then mints a
// one-time magic-link OTP the browser exchanges for a real, RLS-scoped
// Supabase session. The PIN itself never reaches the browser-side client.
import { admin, participantEmail, readJson } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { accessCode, pin } = await readJson(req);
    if (!accessCode || !pin) return res.status(400).json({ error: "Code and PIN are required." });

    const sb = admin();

    // 1. Verify PIN -> participant uuid
    const v = await sb.rpc("verify_participant_pin", { p_code: String(accessCode).trim(), p_pin: String(pin).trim() });
    if (v.error) return res.status(500).json({ error: "Login check failed." });
    if (!v.data) return res.status(401).json({ error: "Wrong code or PIN." });

    // 2. Generate a magic-link OTP for that participant's auth email
    const email = participantEmail(accessCode);
    const link = await sb.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error || !link.data?.properties?.email_otp) {
      return res.status(500).json({ error: "Could not start session." });
    }

    return res.status(200).json({ email, token: link.data.properties.email_otp });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error." });
  }
}
