#!/usr/bin/env node
// ============================================================
// Mosaic — bulk worker→participant assignment importer
// ------------------------------------------------------------
// Usage:
//   export SUPABASE_SERVICE_ROLE_KEY=...        (never commit this)
//   node tools/import-assignments.mjs mapping.txt           # dry run (default)
//   node tools/import-assignments.mjs mapping.txt --apply   # write to Supabase
//
// Mapping file format (one worker per line, '#' for comments):
//   Lochie Arbuthnot: Trey Baxter, Albert Baxter
//   Kerri Richardson -> Jill Long, Jenny Singh
//
// Names are matched case-insensitively against display names. The run
// aborts before writing if ANY name doesn't resolve, so a typo can't
// half-import. Existing active assignments are skipped (safe to re-run).
// ============================================================
import fs from "node:fs";

const URL = process.env.SUPABASE_URL || "https://utmxexdifjwdczredgih.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.argv[2];
const APPLY = process.argv.includes("--apply");

if (!file || !fs.existsSync(file)) { console.error("Usage: node tools/import-assignments.mjs <mapping.txt> [--apply]"); process.exit(1); }
if (!KEY) { console.error("Set SUPABASE_SERVICE_ROLE_KEY in the environment first."); process.exit(1); }

const H = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
const get = async (path) => {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return r.json();
};

// Melbourne local date — must match worker_assigned_to() in the schema.
const todayMel = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date());

// ---- load people ----
const staff = await get("profiles?select=id,display_name,role&role=in.(worker,admin,manager)");
const participants = await get("profiles?select=id,display_name&role=eq.participant");
const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");
const staffByName = new Map(staff.map(s => [norm(s.display_name), s]));
const partByName = new Map(participants.map(p => [norm(p.display_name), p]));
const suggest = (name, pool) => {
  const words = norm(name).split(" ");
  const hit = [...pool.keys()].filter(k => {
    const kw = k.split(" ");
    return words.some(w => kw.includes(w)) || kw.some(w => words.includes(w));
  });
  return hit.length ? `  (did you mean: ${hit.slice(0, 3).join(" / ")}?)` : "";
};

// ---- existing active assignments (for dedupe) ----
const existing = await get("assignments?select=worker_id,participant_id,active_to");
const activeKey = new Set(existing.filter(a => !a.active_to || a.active_to >= todayMel).map(a => a.worker_id + "|" + a.participant_id));

// ---- parse mapping ----
const lines = fs.readFileSync(file, "utf8").split("\n");
const plan = [];   // {worker, participant}
const errors = [];
let skipped = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/#.*/, "").trim();
  if (!line) continue;
  const m = line.split(/:|->/);
  if (m.length < 2) { errors.push(`line ${i + 1}: can't parse "${line}" (expected "Worker: P1, P2")`); continue; }
  const wname = m[0], plist = m.slice(1).join(":");
  const w = staffByName.get(norm(wname));
  if (!w) { errors.push(`line ${i + 1}: unknown staff "${wname.trim()}"${suggest(wname, staffByName)}`); continue; }
  for (const pname of plist.split(",")) {
    if (!pname.trim()) continue;
    const p = partByName.get(norm(pname));
    if (!p) { errors.push(`line ${i + 1}: unknown participant "${pname.trim()}"${suggest(pname, partByName)}`); continue; }
    if (activeKey.has(w.id + "|" + p.id)) { skipped++; console.log(`  ↷ skip (already assigned): ${w.display_name} → ${p.display_name}`); continue; }
    activeKey.add(w.id + "|" + p.id); // dedupe within the file too
    plan.push({ worker: w, participant: p });
  }
}

console.log(`\nParsed: ${plan.length} new assignment(s), ${skipped} already in place, ${errors.length} problem(s).`);
plan.forEach(({ worker, participant }) => console.log(`  + ${worker.display_name} → ${participant.display_name}`));
if (errors.length) { console.log("\nProblems:"); errors.forEach(e => console.log("  ✗ " + e)); }

if (!APPLY) { console.log(`\nDRY RUN — nothing written. Re-run with --apply to create them.`); process.exit(errors.length ? 1 : 0); }
if (errors.length) { console.log("\nABORTED — fix the problems above before applying (no partial import)."); process.exit(1); }

let ok = 0;
for (const { worker, participant } of plan) {
  const r = await fetch(`${URL}/rest/v1/assignments`, {
    method: "POST", headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ worker_id: worker.id, participant_id: participant.id, active_from: todayMel }),
  });
  if (r.status < 300) ok++;
  else console.log(`  ✗ FAILED ${worker.display_name} → ${participant.display_name}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
}
console.log(`\nCreated ${ok}/${plan.length} assignments (active from ${todayMel}).`);
process.exit(ok === plan.length ? 0 : 1);
