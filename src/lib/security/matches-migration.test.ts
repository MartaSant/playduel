import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20261123190000_matches.sql",
  "utf8",
).toLowerCase();

test("matches are paired and moved only through locked server functions", () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /player_id <> uid/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /is_match_player/);
  assert.match(migration, /window_count >= 40/);
  assert.match(migration, /interval '45 seconds'/);
  assert.match(migration, /interval '30 seconds'/);
  assert.match(migration, /interval '2 minutes'/);
  assert.match(migration, /array\['choices', other_seat\]/);
  const policies = migration.slice(migration.indexOf("create policy"));
  assert.equal(policies.includes("for insert"), false);
  assert.equal(policies.includes("for update"), false);
  assert.equal(policies.includes("for delete"), false);
  assert.equal(migration.includes("grant insert"), false);
  assert.equal(migration.includes("grant select on table public.match_state"), false);
});
