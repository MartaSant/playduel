import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20261123200000_admin.sql",
  "utf8",
).toLowerCase();

test("admin data stays behind a second factor and the audit log cannot be edited", () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /aal2/);
  assert.match(migration, /is_anonymous/);
  assert.match(migration, /p_confirmed is not true/);
  assert.match(migration, /audit_immutable/);
  assert.match(migration, /before update or delete on public.audit_log/);
  assert.match(migration, /reason', 'banned'/);
  assert.equal(migration.includes("inet"), false);
  assert.equal(migration.includes("ip_address"), false);
  assert.equal(migration.includes("grant select on table public.audit_log"), false);
  assert.equal(migration.includes("grant select on table public.reports"), false);
  assert.equal(migration.includes("grant select on table public.admins"), false);
});
