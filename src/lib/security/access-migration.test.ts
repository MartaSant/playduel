import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20261123230000_access_log.sql",
  "utf8",
).toLowerCase();

test("visitor addresses are readable only by an active admin and are not an automatic ban", () => {
  assert.match(migration, /ip inet not null/);
  assert.match(migration, /is_active_admin\(\)/);
  assert.match(migration, /alter table public.access_events force row level security/);
  assert.equal(migration.includes("grant select on table public.access_events"), false);
  assert.equal(migration.includes("insert into public.sanctions"), false);
  assert.match(migration, /delete from public.access_events/);
  assert.match(migration, /interval '30 days'/);
  assert.match(migration, /grant execute on function public.log_access/);
  assert.equal(
    migration.includes("grant execute on function public.admin_access(text) to anon"),
    false,
  );
});
