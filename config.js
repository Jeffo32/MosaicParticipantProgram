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
  SUPABASE_URL: "https://utmxexdifjwdczredgih.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0bXhleGRpZmp3ZGN6cmVkZ2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTYyMzUsImV4cCI6MjA5NjU3MjIzNX0.qx6pBcLkWBsYN-3LeQraJubAOrCdisBxJOqxZV2inHw",

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
