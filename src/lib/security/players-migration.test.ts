import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20261123150000_players.sql",
  "utf8",
).toLowerCase();

test("players are protected by row level security for the signed-in user only", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /for select[\s\S]*to authenticated[\s\S]*auth\.uid\(\)/);
  assert.match(migration, /for insert[\s\S]*to authenticated[\s\S]*auth\.uid\(\)/);
  assert.match(migration, /for update[\s\S]*to authenticated[\s\S]*auth\.uid\(\)/);
  assert.equal(migration.includes("for delete"), false);
  assert.equal(migration.includes("to anon"), false);
  assert.equal(migration.includes("grant select, insert, update, delete"), false);
});

test("application source does not reference the service role key", () => {
  const offenders: string[] = [];
  for (const file of sourceFiles("src")) {
    const source = readFileSync(file, "utf8");
    if (
      source.includes("SUPABASE_SERVICE_ROLE_KEY") ||
      source.includes("service_role")
    ) {
      offenders.push(file);
    }
  }
  assert.deepEqual(offenders, []);
});

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...sourceFiles(path));
      continue;
    }
    if (
      (path.endsWith(".ts") || path.endsWith(".tsx")) &&
      !path.endsWith(".test.ts")
    ) {
      files.push(path);
    }
  }
  return files;
}
