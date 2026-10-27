import { test } from "node:test";
import assert from "node:assert/strict";
import { BREAK_SPOTS, HOTSPOTS, MEETING_SPOTS, ROOMS, SEATS, findPath, nearestWalkable, roomAt, walkable } from "./map";

test("every seat and gathering spot is walkable", () => {
  for (const [k, s] of Object.entries(SEATS)) assert.ok(walkable(s.x, s.y), k);
  for (const s of [...MEETING_SPOTS, ...BREAK_SPOTS]) assert.ok(walkable(s.x, s.y), `${s.x},${s.y}`);
});

test("every room is reachable from the start tile", () => {
  for (const r of ROOMS) {
    const c = nearestWalkable((r.rect.x0 + r.rect.x1) / 2, (r.rect.y0 + r.rect.y1) / 2);
    assert.equal(roomAt(c.x, c.y)?.id, r.id, r.id);
    assert.ok(findPath(SEATS.you.x, SEATS.you.y, c.x, c.y), `no path to ${r.id}`);
  }
});

test("each agent can walk from its seat to the stand-up room and back", () => {
  for (const who of ["clerk", "researcher", "writer", "reviewer"] as const) {
    const s = SEATS[who];
    const m = MEETING_SPOTS[0];
    const there = findPath(s.x, s.y, m.x, m.y);
    assert.ok(there && there.length > 0, who);
    for (const step of there!) assert.ok(walkable(step.x, step.y));
    assert.ok(findPath(m.x, m.y, s.x, s.y), `${who} back`);
  }
});

test("hotspots sit next to a walkable tile", () => {
  for (const h of HOTSPOTS) {
    const c = nearestWalkable((h.rect.x0 + h.rect.x1) / 2, h.rect.y1 + 1);
    assert.ok(findPath(SEATS.you.x, SEATS.you.y, c.x, c.y), h.id);
  }
});
