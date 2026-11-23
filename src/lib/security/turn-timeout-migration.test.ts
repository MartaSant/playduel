import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20261123280000_turn_timeout.sql",
  "utf8",
).toLowerCase();

test("an empty connect-four column accepts a disc and a timeout passes the turn", () => {
  assert.match(migration, /found_row := scan/);
  assert.equal(migration.includes("integer"), false);
  assert.match(migration, /deadline_at = now\(\) \+ interval '45 seconds'/);
  assert.match(migration, /'turn', public\.opposite_seat\(turn_seat\)/);
  assert.match(migration, /'mustfrom', null/);
  assert.equal(migration.includes("winner_seat = public.opposite_seat"), false);
  assert.equal(migration.includes("result = 'timeout',\n      winner_seat = public.opposite_seat"), false);
});
