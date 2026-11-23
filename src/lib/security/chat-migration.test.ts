import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20261123270000_match_chat.sql",
  "utf8",
).toLowerCase();

test("match chat is limited to the two players and is not a public table", () => {
  assert.match(migration, /references public\.matches \(id\) on delete cascade/);
  assert.match(migration, /char_length\(body\) between 1 and 200/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /is_match_player\(p_match\)/);
  assert.match(migration, /banned_result\(\)/);
  assert.match(migration, /recent >= 20/);
  assert.equal(migration.includes("grant select"), false);
  assert.equal(migration.includes("grant insert"), false);
  assert.equal(migration.includes("create policy"), false);
  assert.match(migration, /grant execute on function public\.send_match_message\(uuid, text\) to authenticated/);
  assert.equal(migration.includes("grant execute on function public.list_match_messages(uuid) to anon"), false);
  assert.equal(migration.includes("grant execute on function public.send_match_message(uuid, text) to anon"), false);
});
