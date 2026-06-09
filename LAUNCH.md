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

- **Participants** log in with their **name + PIN** (case-insensitive name; PIN issued from the dashboard).
- **Staff** log in with **email + password**. Change your password via the **Password**
  button in the dashboard top bar, or **Forgot password?** on the login screen (emails a reset link).

Status: **LIVE** on Supabase (real multi-user). 40 program participants + 15 staff imported June 2026.

---

## Everyday tasks (staff dashboard → `/admin`)

**Add a participant** *(admins only)* — People → **+ New participant** → name, phone,
a 4-digit PIN, and their mode (Programs / 1:1 / Both). They log into the participant
app with their **name + that PIN**.

**Reset a participant's PIN** — People → tap the person → **Reset PIN**. Admins can
reset anyone's; workers only their assigned participants.

**Assign a support worker** *(admins only)* — People → tap the person → **Support team**
card → pick a worker → Assign. Once per-worker scoping is active, workers only see the
participants assigned to them here.

**Remove a participant** *(admins only)* — People → tap the person → **Delete participant**
(bottom of their profile). This permanently removes their login, bookings, messages,
away days and profile. There's no undo.

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
funding). Each logs in with their **name + their PIN** from the credentials list.
Forgot a PIN? Open their profile → **Reset PIN** and hand them the new one.

## Staff roles & scoping

- **Admins/managers** (full access): add/delete participants, assign workers, manage activities.
- **Workers**: day-to-day view. Once `scope.sql` has been run in Supabase, workers only
  see participants assigned to them (People → participant → **Support team**).
- All staff can change their own password (top-bar **Password** button).

---

## Notifications

- **Primary channel = the dashboard.** New requests/messages appear there live; no setup.
- **Email (Resend): wired and ON**, but in test mode until the `mosaicelitehealth.com`
  domain is verified at resend.com/domains — until then alerts deliver only to the
  Resend account owner's email. After verification, point `RESEND_FROM` and
  `STAFF_NOTIFY_EMAIL` at the real addresses (Vercel env) and redeploy.
- **SMS (Twilio): off.** To turn on: set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_FROM`, `STAFF_NOTIFY_PHONE` in Vercel env, then redeploy.
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
  `admin-delete-participant`, `admin-set-pin`, `notify`, `cron-reminders`.
- **Auth model:** staff = Supabase email/password; participants = name + PIN verified
  server-side and exchanged for an RLS-scoped session. RLS isolates each participant's data.
- **Per-worker scoping:** [`scope.sql`](scope.sql) — run once in the SQL editor to limit
  workers to their assigned participants (also baked into `schema.sql`).

---

## Security & privacy

- Participant PINs are sensitive — share each only with that participant/carer.
- Change the admin password from the one set at launch.
- Consent is captured on a participant's first run (the "Let's go" welcome).
- Some imported phone numbers are a carer's/coordinator's, not the participant's —
  verify before relying on SMS (e.g. Jenny Singh, and a few blanks).

---

## Known gaps / next

- **Run `scope.sql`** in Supabase to activate per-worker scoping (until then, workers see everyone).
- **Verify `mosaicelitehealth.com` in Resend** (needs DNS access) → unlocks real staff
  emails + custom SMTP for password-reset emails (Supabase → Auth → SMTP: host
  `smtp.resend.com`, port `465`, user `resend`, password = Resend API key).
- **Assign workers** to each participant (only a demo assignment exists so far).
- **SMS** is built but off until Twilio keys are added.
- Activities seed is **Mon–Fri**; schema supports Sat/Sun if you add them.
- Front-end runs React via CDN (zero build). A Vite port would speed first load; the
  data layer (`js/db.js`) is already isolated for that.
