// ============================================================
// MOSAIC — Runtime config (committed, public-safe)
// ------------------------------------------------------------
// Paste your Supabase project URL + anon (public) key below.
// The anon key is SAFE to commit — it is protected by Row Level
// Security. NEVER put the service_role key here; that lives only
// in Vercel env vars for /api functions.
//
// Leave these blank to run the app in DEMO MODE (localStorage,
// single device, no login). The moment you fill both in and run
// schema.sql in Supabase, the app becomes real multi-user.
// ============================================================
window.MOSAIC_CONFIG = {
  SUPABASE_URL: "",        // e.g. "https://abcd1234.supabase.co"
  SUPABASE_ANON_KEY: "",   // e.g. "eyJhbGciOi..."

  // Org branding / copy
  ORG_NAME: "Mosaic Elite Health",
  ORG_TAGLINE: "Elite Health Community Hub",

  // Booking rules (mirrors org_settings table when Supabase is on)
  LATE_CANCEL_CUTOFF_DAYS: 4,
  MAX_SESSIONS_PER_DAY: 2,

  // Where the participant-facing app is served (used for staff links)
  APP_URL: "",
};

// Convenience flag the rest of the app reads.
window.MOSAIC_CONFIG.SUPABASE_ENABLED = !!(
  window.MOSAIC_CONFIG.SUPABASE_URL && window.MOSAIC_CONFIG.SUPABASE_ANON_KEY
);
