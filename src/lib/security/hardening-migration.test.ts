import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const migrations = readdirSync("supabase/migrations")
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(`supabase/migrations/${name}`, "utf8"));

const fullSql = migrations.join("\n").toLowerCase();
const accessLog = readFileSync(
  "supabase/migrations/20261123230000_access_log.sql",
  "utf8",
).toLowerCase();
const sql = fullSql
  .replace(accessLog, "")
  .replace(/create or replace function public\.log_access[\s\S]*?\$\$;/g, "");
const hardening = readFileSync(
  "supabase/migrations/20261123210000_hardening.sql",
  "utf8",
).toLowerCase();

test("every public table has forced row level security and addresses stay in the admin log", () => {
  const tables = [...fullSql.matchAll(/create table public\.([a-z_]+)/g)].map((match) => match[1]);
  assert.ok(tables.includes("attempt_windows"));
  for (const table of tables) {
    assert.match(fullSql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(fullSql, new RegExp(`alter table public\\.${table} force row level security`));
  }
  assert.equal(sql.includes("inet"), false);
  assert.equal(sql.includes("ip_address"), false);
});

test("abuse limits and cleanup stay off the public api and keep the audit log", () => {
  assert.match(hardening, /players where id = auth\.uid\(\)/);
  assert.match(hardening, /consume_attempt\('join_room', 30, interval '10 minutes'\)/);
  assert.match(hardening, /consume_attempt\('enqueue', 20, interval '1 hour'\)/);
  assert.match(hardening, /consume_attempt\('nickname', 20, interval '1 hour'\)/);
  assert.match(hardening, /reason', 'rate_limited'/);
  assert.match(hardening, /interval '30 days'/);
  assert.equal(hardening.includes("delete from public.audit_log"), false);
  assert.equal(hardening.includes("delete from public.reports"), false);
  assert.equal(hardening.includes("delete from public.sanctions"), false);
  assert.equal(hardening.includes("grant select on table public.attempt_windows"), false);
  assert.equal(hardening.includes("grant execute on function public.purge_operational_data"), false);
  assert.equal(hardening.includes("grant execute on function public.consume_attempt"), false);
});
