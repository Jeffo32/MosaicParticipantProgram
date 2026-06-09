# Mosaic Participant Program

Participant + staff hub for **Mosaic Elite Health**. Participants pick their
weekly activities, fill out an About Me intake, ask for help, and message the
team. Staff see all of it live in a dashboard.

- **Participant app:** [`index.html`](index.html)
- **Staff dashboard:** [`admin.html`](admin.html)
- **Backend:** Supabase (Postgres + Auth + RLS), schema in [`schema.sql`](schema.sql)
- **Serverless:** Vercel functions in [`api/`](api/) (participant login, notifications, nightly SMS)

---

## Two modes

The app runs in one of two modes automatically, based on whether you've put
Supabase keys in [`config.js`](config.js):

| | DEMO mode (default) | LIVE mode |
|---|---|---|
| Trigger | `config.js` keys blank | `config.js` has Supabase URL + anon key |
| Storage | `localStorage` (one device) | Supabase (real multi-user) |
| Login | any code/PIN gets you in | real access-code + PIN / staff email + password |
| Use | demos, owner review | production |

**You can open `index.html` and `admin.html` right now** with no setup — it all
works in demo mode on a single device (a "Demo Participant"), so you can click
the whole loop: pick activities → see them in the dashboard, raise a help
request → action it, message → reply.

---

## Going live (≈15 min)

### 1. Create a Supabase project
[supabase.com](https://supabase.com) → New project. Copy the **Project URL** and
**anon public key** (Settings → API).

### 2. Run the SQL
In the Supabase **SQL editor**, run [`schema.sql`](schema.sql), then
[`seed.sql`](seed.sql) (seeds the activity list).

### 3. Create your first staff account
Supabase → Authentication → Users → **Add user** (your email + password). Copy
the new user's UUID, then in the SQL editor:

```sql
insert into profiles (id, role, display_name)
values ('PASTE-UUID', 'admin', 'Your Name')
on conflict (id) do update set role = 'admin';
```

### 4. Fill in `config.js`
```js
SUPABASE_URL: "https://xxxx.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi...",   // anon/public key — safe to commit
```
> The anon key is public by design and protected by Row Level Security. The
> **service_role** key must NEVER go here — it lives only in Vercel env vars.

### 5. Deploy to Vercel
```bash
npm i -g vercel       # if needed
vercel                # link + deploy preview
vercel --prod         # production
```
Then add these **Environment Variables** in the Vercel project (Settings → Env):

| Variable | Required for | Value |
|---|---|---|
| `SUPABASE_URL` | participant login, admin create, cron | your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | same | Supabase → Settings → API → service_role |
| `CRON_SECRET` | nightly reminder auth | any long random string |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | SMS (optional) | from Twilio |
| `STAFF_NOTIFY_PHONE` | SMS to staff on new request (optional) | e.g. `+61…` |
| `RESEND_API_KEY` / `STAFF_NOTIFY_EMAIL` | email to staff (optional) | from Resend |

Everything except `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` is optional —
without Twilio/Resend the dashboard is still your always-on notification channel.

### 6. Add participants
Log into `admin.html` → **People → New participant**. It provisions their login
and shows you the **access code + PIN** to hand over. That's what they type into
`index.html`.

---

## How auth works

- **Staff** sign in with email + password (Supabase Auth). RLS scopes them via
  `is_staff()` / `is_admin()`.
- **Participants** sign in with an **access code + PIN**. The PIN is verified
  server-side ([`api/participant-login.js`](api/participant-login.js)) and
  exchanged for a real, RLS-scoped Supabase session — the PIN never grants
  direct database access.

---

## Project layout

```
index.html              Participant app (React via CDN, local-first)
admin.html              Staff dashboard
config.js               Supabase keys + booking rules (edit me)
js/db.js                Dual-mode data layer (Supabase | localStorage)
js/activities.js        Default activity catalogue (shared)
schema.sql / seed.sql   Database
api/                    Vercel serverless functions
  participant-login.js      code+PIN -> session
  admin-create-participant.js  staff-only participant provisioning
  notify.js                 best-effort SMS/email to staff
  cron-reminders.js         nightly "tomorrow's sessions" SMS
manifest.webmanifest    PWA (Add to Home Screen)
sw.js                   Service worker (offline shell)
vercel.json             Cron + security headers
```

## Nightly reminders

`vercel.json` runs [`api/cron-reminders.js`](api/cron-reminders.js) daily at
**09:00 UTC (19:00 AEST)**. It texts each participant tomorrow's sessions. If
Twilio isn't configured it logs a preview to `notifications_log` instead of
sending. Adjust the `crons` schedule for daylight saving as needed.

## Notes / future hardening

- Front-end uses React + Babel via CDN (zero build). For lower first-load
  latency later, port to Vite — the data layer (`js/db.js`) is already isolated.
- Activities are seeded Mon–Fri; the schema supports `day_of_week` 1–7 if you
  add weekends.
