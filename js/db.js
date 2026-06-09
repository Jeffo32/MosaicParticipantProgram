/* ============================================================
   MOSAIC — Data layer (window.MosaicDB)
   ------------------------------------------------------------
   Dual-mode, local-first:
     • SUPABASE mode  — when config.js has URL + anon key. Real
       auth, real multi-user, RLS-scoped reads/writes.
     • DEMO mode      — otherwise. Pure localStorage, single
       device. The whole app still works for demos/owner review.

   Strategy = LOCAL-FIRST MIRROR. The participant UI always reads
   from localStorage (instant, offline-safe). On login we PULL the
   server state into localStorage; on save we PUSH localStorage to
   the server. The admin dashboard reads the server directly.

   Loaded as a plain <script> (no JSX) before the app script.
   ============================================================ */
(function () {
  "use strict";

  var CFG = window.MOSAIC_CONFIG || {};
  var ENABLED = !!CFG.SUPABASE_ENABLED;

  // ---- localStorage keys (kept compatible with the original app) ----
  var K = {
    BOOKINGS: "mosaic_bookings_v2",
    STARTED: "mosaic_started_v1",
    PROFILE: "mosaic_profile_v1",
    REQUESTS: "mosaic_service_requests_v1",
    CHAT: "mosaic_chat_v1",
    SESSION: "mosaic_session_v1",
    CONSENT: "mosaic_consent_v1",
    AWAY: "mosaic_away_v1",
    ONBOARDED: "mosaic_onboarded_v1",
    SCALE: "mosaic_scale_v1",
  };

  // ---- tiny storage helpers ----
  function ls(key, fb) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fb : v; }
    catch (e) { return fb; }
  }
  function lset(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  // ---- Supabase client (CDN UMD global `supabase`) ----
  var sb = null;
  if (ENABLED && window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } else if (ENABLED) {
    console.warn("[MosaicDB] Supabase configured but CDN client not loaded — falling back to demo mode.");
    ENABLED = false;
  }

  // ============================================================
  // SESSION
  // session = { role, id, name, mode, email? } | null
  // ============================================================
  var session = ls(K.SESSION, null);
  var authListeners = [];
  function setSession(s) {
    session = s;
    lset(K.SESSION, s);
    authListeners.forEach(function (cb) { try { cb(s); } catch (e) {} });
  }

  // ============================================================
  // AUTH
  // ============================================================
  var auth = {
    get session() { return session; },
    onChange: function (cb) { authListeners.push(cb); return function () { authListeners = authListeners.filter(function (f) { return f !== cb; }); }; },

    // Staff: real Supabase email/password (demo: any email + pwd "demo")
    staffLogin: async function (email, password) {
      if (!ENABLED) {
        if (!email) throw new Error("Enter an email.");
        setSession({ role: "admin", id: "demo-staff", name: email.split("@")[0] || "Staff", email: email });
        return session;
      }
      var r = await sb.auth.signInWithPassword({ email: email, password: password });
      if (r.error) throw r.error;
      var uid = r.data.user.id;
      var p = await sb.from("profiles").select("id, role, display_name, mode").eq("id", uid).single();
      if (p.error) throw p.error;
      if (p.data.role !== "admin" && p.data.role !== "manager" && p.data.role !== "worker") {
        await sb.auth.signOut();
        throw new Error("This account is not a staff account.");
      }
      setSession({ role: p.data.role, id: uid, name: p.data.display_name, mode: p.data.mode, email: email });
      return session;
    },

    // Participant: access code + PIN.
    //  • Supabase mode → /api/participant-login mints an OTP we verify.
    //  • Demo mode     → any non-empty code logs into the local participant.
    participantLogin: async function (accessCode, pin) {
      accessCode = (accessCode || "").trim();
      if (!ENABLED) {
        if (!accessCode) throw new Error("Enter your code.");
        var prof = data._localProfile();
        setSession({ role: "participant", id: "demo-participant", name: prof.name || "", mode: "both" });
        return session;
      }
      var resp = await fetch("/api/participant-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: accessCode, pin: pin }),
      });
      var body = await resp.json().catch(function () { return {}; });
      if (!resp.ok) throw new Error(body.error || "Login failed. Check your code and PIN.");
      var v = await sb.auth.verifyOtp({ email: body.email, token: body.token, type: "magiclink" });
      if (v.error) throw v.error;
      var uid = v.data.user.id;
      var pr = await sb.from("profiles").select("id, display_name, mode").eq("id", uid).single();
      if (pr.error) throw pr.error;
      setSession({ role: "participant", id: uid, name: pr.data.display_name, mode: pr.data.mode || "both" });
      await data.pullParticipant();
      return session;
    },

    logout: async function () {
      if (ENABLED && sb) { try { await sb.auth.signOut(); } catch (e) {} }
      setSession(null);
    },

    // Re-hydrate a Supabase session on page load (token may have refreshed).
    restore: async function () {
      if (!ENABLED || !sb) return session;
      var r = await sb.auth.getSession();
      if (!r.data.session) { if (session) setSession(null); return null; }
      // session object already in localStorage; trust it if user id matches.
      var uid = r.data.session.user.id;
      if (session && session.id === uid) return session;
      var p = await sb.from("profiles").select("id, role, display_name, mode").eq("id", uid).single();
      if (!p.error && p.data) {
        setSession({ role: p.data.role, id: uid, name: p.data.display_name, mode: p.data.mode, email: r.data.session.user.email });
      }
      return session;
    },
  };

  // ============================================================
  // DATA
  // ============================================================
  var data = {
    mode: ENABLED ? "supabase" : "demo",
    sb: sb,

    _localProfile: function () {
      return ls(K.PROFILE, {
        name: "", date: "", likes: {}, favoriteLikes: [],
        strengths: {}, favoriteStrengths: [], skills: {}, favoriteSkills: [],
        wellbeing: {}, otherHobbies: "", otherStrengths: "", otherSkills: "",
      });
    },

    // ---------- ACTIVITIES ----------
    // Returns the catalogue. In demo mode the app uses its built-in
    // ACTIVITIES constant; in Supabase mode staff-managed rows win.
    listActivities: async function () {
      if (!ENABLED) return null; // signal: caller should use built-in list
      var r = await sb.from("activities").select("*").order("day_of_week", { ascending: true });
      if (r.error) { console.warn("[MosaicDB] listActivities", r.error); return null; }
      return r.data.map(_activityFromRow);
    },

    // ---------- PARTICIPANT: PULL (server -> localStorage) ----------
    pullParticipant: async function () {
      if (!ENABLED || !session || session.role !== "participant") return;
      var pid = session.id;
      // bookings
      var b = await sb.from("bookings").select("activity_id,date,status,cancel_charge,cancelled_at,created_at").eq("participant_id", pid);
      if (!b.error) {
        var map = {};
        b.data.forEach(function (row) {
          (map[row.date] = map[row.date] || []).push({
            activityId: row.activity_id, status: row.status,
            cancel_charge: row.cancel_charge, cancelled_at: row.cancelled_at,
            addedAt: row.created_at,
          });
        });
        lset(K.BOOKINGS, map);
      }
      // about-me profile
      var pr = await sb.from("participants").select("about_me").eq("id", pid).single();
      if (!pr.error && pr.data && pr.data.about_me) {
        var prof = pr.data.about_me;
        prof.name = prof.name || session.name;
        lset(K.PROFILE, prof);
      }
      // service requests
      var s = await sb.from("service_requests").select("id,type,detail,status,created_at").eq("participant_id", pid).order("created_at", { ascending: false });
      if (!s.error) lset(K.REQUESTS, s.data.map(function (r) { return { id: r.id, type: r.type, detail: r.detail, status: r.status, created_at: r.created_at }; }));
    },

    // ---------- PARTICIPANT: PUSH bookings (localStorage -> server) ----------
    // Idempotent: upserts current bookings, reconciles removals for
    // today + future dates. Safe no-op in demo mode.
    pushBookings: async function () {
      if (!ENABLED || !session || session.role !== "participant") return { ok: true, demo: true };
      var pid = session.id;
      var map = ls(K.BOOKINGS, {});
      var rows = [];
      var localKeys = {};
      Object.keys(map).forEach(function (date) {
        (map[date] || []).forEach(function (bk) {
          localKeys[date + "|" + bk.activityId] = true;
          rows.push({
            participant_id: pid, activity_id: bk.activityId, date: date,
            status: bk.status, cancel_charge: !!bk.cancel_charge,
            cancelled_at: bk.cancelled_at || null,
          });
        });
      });
      try {
        if (rows.length) {
          var up = await sb.from("bookings").upsert(rows, { onConflict: "participant_id,date,activity_id" });
          if (up.error) throw up.error;
        }
        // reconcile deletes for today+future
        var today = _todayIso();
        var srv = await sb.from("bookings").select("id,date,activity_id").eq("participant_id", pid).gte("date", today);
        if (!srv.error) {
          var stale = srv.data.filter(function (r) { return !localKeys[r.date + "|" + r.activity_id]; }).map(function (r) { return r.id; });
          if (stale.length) await sb.from("bookings").delete().in("id", stale);
        }
        return { ok: true };
      } catch (e) {
        console.warn("[MosaicDB] pushBookings failed (kept locally):", e.message);
        return { ok: false, error: e.message };
      }
    },

    // ---------- PARTICIPANT: PUSH profile ----------
    pushProfile: async function (profile) {
      lset(K.PROFILE, profile);
      if (!ENABLED || !session || session.role !== "participant") return { ok: true, demo: true };
      try {
        var u = await sb.from("participants").update({ about_me: profile }).eq("id", session.id);
        if (u.error) throw u.error;
        if (profile.name && profile.name !== session.name) {
          await sb.from("profiles").update({ display_name: profile.name }).eq("id", session.id);
          setSession(Object.assign({}, session, { name: profile.name }));
        }
        return { ok: true };
      } catch (e) {
        console.warn("[MosaicDB] pushProfile failed (kept locally):", e.message);
        return { ok: false, error: e.message };
      }
    },

    // ---------- PARTICIPANT: service request ----------
    createServiceRequest: async function (type, detail) {
      var rec = { id: Date.now(), type: type, detail: detail, status: "open", created_at: new Date().toISOString() };
      var all = ls(K.REQUESTS, []); all.push(rec); lset(K.REQUESTS, all);
      if (!ENABLED || !session || session.role !== "participant") return { ok: true, demo: true };
      try {
        var ins = await sb.from("service_requests").insert({ participant_id: session.id, type: type, detail: detail, status: "open" }).select().single();
        if (ins.error) throw ins.error;
        // best-effort staff notification (won't block UX if it fails)
        _notify("service_request", { participant: session.name, type: type, detail: detail, id: ins.data.id });
        return { ok: true, id: ins.data.id };
      } catch (e) {
        console.warn("[MosaicDB] createServiceRequest failed (kept locally):", e.message);
        return { ok: false, error: e.message };
      }
    },

    // ---------- PARTICIPANT: away periods ----------
    listAway: async function () {
      if (!ENABLED) return ls(K.AWAY, []);
      if (!session || session.role !== "participant") return [];
      var r = await sb.from("away_periods").select("id,start_date,end_date,note").eq("participant_id", session.id).order("start_date");
      if (r.error) { console.warn("[MosaicDB] listAway", r.error); return ls(K.AWAY, []); }
      return r.data.map(function (x) { return { id: x.id, start: x.start_date, end: x.end_date, note: x.note }; });
    },
    addAway: async function (start, end, note) {
      end = end || start;
      if (!ENABLED || !session || session.role !== "participant") {
        var a = ls(K.AWAY, []); a.push({ id: Date.now(), start: start, end: end, note: note || "" }); lset(K.AWAY, a);
        return { ok: true, demo: true };
      }
      try {
        var ins = await sb.from("away_periods").insert({ participant_id: session.id, start_date: start, end_date: end, note: note || null }).select().single();
        if (ins.error) throw ins.error;
        _notify("away", { participant: session.name, start: start, end: end, note: note });
        return { ok: true, id: ins.data.id };
      } catch (e) { console.warn("[MosaicDB] addAway", e.message); return { ok: false, error: e.message }; }
    },
    removeAway: async function (id) {
      if (!ENABLED || !session || session.role !== "participant") {
        lset(K.AWAY, ls(K.AWAY, []).filter(function (x) { return String(x.id) !== String(id); }));
        return { ok: true, demo: true };
      }
      try { var d = await sb.from("away_periods").delete().eq("id", id); if (d.error) throw d.error; return { ok: true }; }
      catch (e) { return { ok: false, error: e.message }; }
    },

    // ---------- PARTICIPANT: messages ----------
    listMessages: async function () {
      if (!ENABLED || !session || session.role !== "participant") return null;
      var r = await sb.from("messages").select("id,sender,body,created_at").eq("participant_id", session.id).order("created_at", { ascending: true });
      if (r.error) { console.warn("[MosaicDB] listMessages", r.error); return null; }
      return r.data.map(function (m) { return { id: m.id, from: m.sender === "participant" ? "me" : "them", at: m.created_at, text: m.body }; });
    },
    sendMessage: async function (text) {
      if (!ENABLED || !session) return { ok: true, demo: true };
      try {
        var ins = await sb.from("messages").insert({ participant_id: session.id, sender: "participant", body: text }).select().single();
        if (ins.error) throw ins.error;
        _notify("message", { participant: session.name, text: text });
        return { ok: true, id: ins.data.id };
      } catch (e) { return { ok: false, error: e.message }; }
    },
    // Unsend: participant deletes their own message (chat undo). Demo handled in UI.
    deleteMessage: async function (id) {
      if (!ENABLED || !session) return { ok: true, demo: true };
      try { var d = await sb.from("messages").delete().eq("id", id); if (d.error) throw d.error; return { ok: true }; }
      catch (e) { return { ok: false, error: e.message }; }
    },

    // ============================================================
    // ADMIN / STAFF QUERIES (admin.html). Supabase only.
    // ============================================================
    admin: {
      enabled: ENABLED,

      listParticipants: async function () {
        var r = await sb.from("profiles").select("id, display_name, phone, mode, role, created_at").eq("role", "participant").order("display_name");
        if (r.error) throw r.error; return r.data;
      },

      getParticipant: async function (id) {
        var p = await sb.from("profiles").select("id, display_name, phone, mode").eq("id", id).single();
        if (p.error) throw p.error;
        var d = await sb.from("participants").select("about_me, dislikes, allergies, behavioural_regulators, life_background").eq("id", id).single();
        return Object.assign({}, p.data, d.error ? {} : d.data);
      },

      // Create a participant end-to-end via the serverless admin function.
      createParticipant: async function (payload) {
        var token = (await sb.auth.getSession()).data.session.access_token;
        var resp = await fetch("/api/admin-create-participant", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify(payload),
        });
        var body = await resp.json().catch(function () { return {}; });
        if (!resp.ok) throw new Error(body.error || "Could not create participant.");
        return body;
      },

      listServiceRequests: async function (status) {
        var q = sb.from("service_requests").select("id, type, detail, status, created_at, participant_id, profiles!service_requests_participant_id_fkey(display_name, phone)").order("created_at", { ascending: false });
        if (status) q = q.eq("status", status);
        var r = await q; if (r.error) throw r.error; return r.data;
      },
      setServiceRequestStatus: async function (id, status) {
        var r = await sb.from("service_requests").update({ status: status }).eq("id", id);
        if (r.error) throw r.error; return true;
      },

      // All bookings for a week (Mon..Sun ISO bounds), with participant + activity.
      listBookingsForWeek: async function (mondayIso, sundayIso) {
        var r = await sb.from("bookings")
          .select("id, date, status, cancel_charge, worker_id, participant_id, activity_id, profiles!bookings_participant_id_fkey(display_name, phone), activities(name, emoji, color, start_block, end_block, bring_money_amount, location:notes)")
          .gte("date", mondayIso).lte("date", sundayIso)
          .order("date", { ascending: true });
        if (r.error) throw r.error; return r.data;
      },
      setBookingStatus: async function (id, status) {
        var patch = { status: status };
        if (status === "cancelled" || status === "late_cancelled") patch.cancelled_at = new Date().toISOString();
        var r = await sb.from("bookings").update(patch).eq("id", id);
        if (r.error) throw r.error; return true;
      },
      assignWorker: async function (bookingId, workerId) {
        var r = await sb.from("bookings").update({ worker_id: workerId || null }).eq("id", bookingId);
        if (r.error) throw r.error; return true;
      },

      listActivities: async function () {
        var r = await sb.from("activities").select("*").order("day_of_week");
        if (r.error) throw r.error; return r.data;
      },
      saveActivity: async function (row) {
        var r = row.id
          ? await sb.from("activities").update(row).eq("id", row.id)
          : await sb.from("activities").insert(row);
        if (r.error) throw r.error; return true;
      },
      deleteActivity: async function (id) {
        var r = await sb.from("activities").delete().eq("id", id);
        if (r.error) throw r.error; return true;
      },

      listWorkers: async function () {
        var r = await sb.from("profiles").select("id, display_name").in("role", ["worker", "manager", "admin"]).order("display_name");
        if (r.error) throw r.error; return r.data;
      },

      getAway: async function (participantId) {
        var r = await sb.from("away_periods").select("id, start_date, end_date, note").eq("participant_id", participantId).order("start_date");
        if (r.error) throw r.error; return r.data;
      },
      listAwayForWeek: async function (mondayIso, sundayIso) {
        var r = await sb.from("away_periods")
          .select("id, start_date, end_date, note, participant_id, profiles!away_periods_participant_id_fkey(display_name)")
          .lte("start_date", sundayIso).gte("end_date", mondayIso).order("start_date");
        if (r.error) throw r.error; return r.data;
      },

      listMessages: async function (participantId) {
        var r = await sb.from("messages").select("id, sender, body, created_at").eq("participant_id", participantId).order("created_at");
        if (r.error) throw r.error; return r.data;
      },
      replyMessage: async function (participantId, text) {
        var r = await sb.from("messages").insert({ participant_id: participantId, sender: "staff", body: text }).select().single();
        if (r.error) throw r.error;
        _notify("staff_reply", { participantId: participantId, text: text });
        return r.data;
      },
    },
  };

  // ---- helpers ----
  function _todayIso() { var d = new Date(); d.setHours(12, 0, 0, 0); return d.toISOString().slice(0, 10); }
  function _activityFromRow(row) {
    return {
      id: row.id, emoji: row.emoji, name: row.name, color: row.color,
      category: row.category, days: row.day_of_week ? [row.day_of_week] : [],
      start_block: row.start_block, end_block: row.end_block,
      mode: row.mode, location: (row.notes || "").trim() || null,
      practitioner_led: row.practitioner_led, bring_money: row.bring_money_amount,
      time: null,
    };
  }
  // Fire-and-forget notification to /api/notify (no-op if not deployed).
  function _notify(kind, payload) {
    try {
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: kind, payload: payload }),
      }).catch(function () {});
    } catch (e) {}
  }

  // ---- consent / first-run flags (local, cheap) ----
  var flags = {
    consentGiven: function () { return !!ls(K.CONSENT, false); },
    giveConsent: function () { lset(K.CONSENT, { at: new Date().toISOString() }); },
    hasStarted: function () { return !!localStorage.getItem(K.STARTED); },
    markStarted: function () { lset(K.STARTED, 1); },
    // Onboarded if explicitly marked OR profile already has a name (so
    // returning users — incl. on a new device after pull — skip onboarding).
    onboarded: function () { return !!ls(K.ONBOARDED, false) || !!(data._localProfile().name); },
    markOnboarded: function () { lset(K.ONBOARDED, { at: new Date().toISOString() }); },
    // App-wide magnification (default a touch bigger than 1.0 out of the box).
    scale: function () { var s = ls(K.SCALE, null); return (typeof s === "number" && s >= 0.8 && s <= 2) ? s : 1.1; },
    setScale: function (n) { lset(K.SCALE, n); },
  };

  // ---- ready (restore Supabase session) ----
  var ready = (async function () {
    if (ENABLED) { try { await auth.restore(); } catch (e) { console.warn("[MosaicDB] restore", e); } }
    return true;
  })();

  // ---- public surface ----
  window.MosaicDB = {
    mode: data.mode,
    ENABLED: ENABLED,
    ready: ready,
    keys: K,
    ls: ls, lset: lset,
    auth: auth,
    flags: flags,
    activities: { list: data.listActivities },
    pullParticipant: data.pullParticipant,
    pushBookings: data.pushBookings,
    pushProfile: data.pushProfile,
    createServiceRequest: data.createServiceRequest,
    away: { list: data.listAway, add: data.addAway, remove: data.removeAway },
    listMessages: data.listMessages,
    sendMessage: data.sendMessage,
    deleteMessage: data.deleteMessage,
    admin: data.admin,
  };
})();
