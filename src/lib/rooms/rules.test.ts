import assert from "node:assert/strict";
import test from "node:test";
import {
  isRoomCode,
  normalizeRoomCode,
  parseRoomResult,
  ROOM_CODE_LENGTH,
  safeRoomNext,
  seatCount,
} from "./rules.ts";

test("room codes use the unambiguous alphabet and a fixed length", () => {
  assert.equal(isRoomCode("AB23EFGH"), true);
  assert.equal("AB23EFGH".length, ROOM_CODE_LENGTH);
  assert.equal(isRoomCode("AB23EFG"), false);
  assert.equal(isRoomCode("AB23EFGHO"), false);
  assert.equal(isRoomCode("ab23efgh"), false);
  assert.equal(normalizeRoomCode(" ab23efgh "), "AB23EFGH");
});

test("a return path can only point at a room code", () => {
  assert.equal(safeRoomNext("/room/AB23EFGH"), "/room/AB23EFGH");
  assert.equal(safeRoomNext("/room/ab23efgh"), null);
  assert.equal(safeRoomNext("/profile"), null);
  assert.equal(safeRoomNext("//room/AB23EFGH"), null);
  assert.equal(safeRoomNext("/room/AB23EFGH/extra"), null);
});

test("two active players fill the room and zero closes it", () => {
  assert.equal(seatCount(1), "waiting");
  assert.equal(seatCount(2), "full");
  assert.equal(seatCount(0), "closed");
});

test("room responses without the expected shape are unavailable", () => {
  assert.deepEqual(parseRoomResult({ ok: false, reason: "full" }), {
    ok: false,
    reason: "full",
  });
  assert.equal(parseRoomResult({ ok: true, access: "guest" }).ok, false);
  const preview = parseRoomResult({
    ok: true,
    access: "guest",
    code: "AB23EFGH",
    gameSlug: "tris",
    status: "waiting",
    seats: 1,
  });
  assert.equal(preview.ok, true);
  if (preview.ok) {
    assert.equal(preview.access, "guest");
  }
});
