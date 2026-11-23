import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20261123170000_rooms.sql",
  "utf8",
).toLowerCase();

test("room changes are limited to the signed-in member and the code is the only link secret", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /recent >= 8/);
  assert.match(migration, /active_count >= 2/);
  assert.match(migration, /interval '2 hours'/);
  const policies = migration.slice(migration.indexOf("create policy"));
  assert.equal(policies.includes("for insert"), false);
  assert.equal(policies.includes("for update"), false);
  assert.equal(policies.includes("for delete"), false);
  assert.equal(migration.includes("grant select on table public.rooms to anon"), false);
  assert.match(
    migration,
    /grant execute on function public\.room_state\(text\) to anon, authenticated/,
  );
});
