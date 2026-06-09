# Mosaic — Launch & Operations Runbook

The day-to-day guide for running the Mosaic Participant Program app.
For how it's built, see [README.md](README.md).

> **No secrets live in this file** (it's a public repo). Keys live in
> Vercel env vars; the public anon key is in `config.js` (safe — RLS
> protects it). Participant codes/PINs are handed out privately.

---

## Live URLs

| | URL |
|---|---|
| **Participant app** | https://mosaic-participant-program.vercel.app |
| **Staff dashboard** | https://mosaic-participant-program.vercel.app/admin |

- **Participants** log in with a **code + PIN** (issued from the dashboard).
- **Staff** log in with **email + password**. Admin account: `jeffo.productions@gmail.com`
  (change the password in Supabase → Authentication → Users).

Status: **LIVE** on Supabase (real multi-user). 40 program participants imported June 2026.

---

## Everyday tasks (staff dashboard → `/admin`)

**Add a participant** — People → **+ New participant** → fill name, phone, a unique
access code, a 4-digit PIN, and their mode (Programs / 1:1 / Both). Hand them the
code + PIN. They log into the participant app with those.

**Remove a participant** — People → tap the person → **Delete participant** (bottom of
their profile). This permanently removes their login, bookings, messages, away days
and profile. There's no undo.

**See who's coming this week** — Week tab. Shows each booking per day; **Confirm** /
**Cancel** a session, or **Assign worker**. An **"Away this week"** banner shows anyone
who marked themselves away.

**Action a help request** — Requests tab. Participants' service requests (doctor,
cleaning, respite, "feeling overwhelmed", etc.) land here. Mark **actioned** / **closed**.
Refreshes every ~8s.

**Message a participant** — Chat tab. Pick a person, reply. They see it in their app.

**Manage activities** — Activities tab → **+ New activity** / **Edit**. Day, time blocks,
mode, location, colour, emoji. These are what participants choose from.

**See a participant's details** — People → tap them. Shows their self-reported **About Me**
(likes/strengths/skills/wellbeing), **care notes**, **away days**, and **Mosaic records**
(DOB, primary contact, funding) imported from the CRM.

The dashboard is **responsive**: laptops get the wide top-nav layout, phones get the
bottom-nav layout.

---

## Issuing logins to the imported 40

The 40 program participants already have accounts (name, phone, DOB, primary contact,
funding). Each has a **code + PIN** — hand them out from the credentials list. To reset
someone's PIN, currently re-create them, or ask the dev to run `set_participant_pin`.
(A staff "reset PIN" button is a known future add — see below.)

---

## Notifications

- **Primary channel = the dashboard.** New requests/messages appear there live; no setup.
- **SMS/email are optional** and currently **off**. To turn on:
  - SMS (Twilio): set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`,
    `STAFF_NOTIFY_PHONE` in Vercel env, then redeploy.
  - Email (Resend): set `RESEND_API_KEY`, `STAFF_NOTIFY_EMAIL`.
- **Nightly reminder** cron (`/api/cron-reminders`) runs daily at **09:00 UTC (7pm AEST)**;
  it texts each participant tomorrow's sessions once Twilio is configured (logs a preview
  otherwise). Adjust the time in `vercel.json` for daylight saving.

---

## Deploying changes

The project is linked to the Vercel team **deku-57bb7dd6**.

```bash
# from the repo
git add -A && git commit -m "…" && git push origin main
vercel --prod --yes --scope deku-57bb7dd6
```

(Or connect the GitHub repo in Vercel for auto-deploy on push to `main`.)

---

## Backend reference

- **Supabase project ref:** `utmxexdifjwdczredgih` (URL in `config.js`).
- **Schema:** [`schema.sql`](schema.sql) — safe to re-run (idempotent). [`seed.sql`](seed.sql)
  loads the activity list (only if empty).
- **Env vars (Vercel, Production):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_ANON_KEY`, `CRON_SECRET` (+ optional Twilio/Resend above). The
  **service_role** key is admin-level — Vercel env only, never client-side.
- **Serverless functions** (`/api`): `participant-login`, `admin-create-participant`,
  `admin-delete-participant`, `notify`, `cron-reminders`.
- **Auth model:** staff = Supabase email/password; participants = code + PIN verified
  server-side and exchanged for an RLS-scoped session. RLS isolates each participant's data.

---

## Security & privacy

- Participant codes/PINs are sensitive — share each only with that participant/carer.
- Change the admin password from the one set at launch.
- Consent is captured on a participant's first run (the "Let's go" welcome).
- Some imported phone numbers are a carer's/coordinator's, not the participant's —
  verify before relying on SMS (e.g. Jenny Singh, and a few blanks).

---

## Known gaps / next

- **Staff "reset participant PIN"** button (currently dev-only via `set_participant_pin`).
- **SMS/email** delivery is built but off until Twilio/Resend keys are added.
- Activities seed is **Mon–Fri**; schema supports Sat/Sun if you add them.
- Front-end runs React via CDN (zero build). A Vite port would speed first load; the
  data layer (`js/db.js`) is already isolated for that.
