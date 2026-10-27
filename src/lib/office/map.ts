/*
 * The office floor plan in 16 px tiles. Pure data: rooms, walls, doors, furniture footprints, seats and hotspots.
 * The renderer paints it, the engine walks on it, the tests check every room can be reached.
 */

export const TILE = 16;
export const W = 58;
export const H = 40;

export type RoomId = "lab" | "restroom" | "review" | "hall" | "standup" | "break" | "writers";
export type Rect = { x0: number; y0: number; x1: number; y1: number };
export type Floor = "teal" | "tiles" | "brick" | "cream" | "blue" | "wood" | "grey";

export type Room = { id: RoomId; name: string; floor: Floor; dot: string; rect: Rect; wall: Rect | null; mini: string };

/** Floor rect (walkable unless furniture) and the painted back-wall strip above it. */
export const ROOMS: Room[] = [
  { id: "lab", name: "Research Lab", floor: "teal", dot: "#4e9a91", rect: { x0: 1, y0: 4, x1: 22, y1: 12 }, wall: { x0: 1, y0: 1, x1: 22, y1: 3 }, mini: "#3f7f78" },
  { id: "restroom", name: "Restroom", floor: "tiles", dot: "#b9d3ea", rect: { x0: 24, y0: 4, x1: 34, y1: 12 }, wall: { x0: 24, y0: 1, x1: 34, y1: 3 }, mini: "#9fb6cc" },
  { id: "review", name: "Review Office", floor: "brick", dot: "#c66a3d", rect: { x0: 36, y0: 4, x1: 56, y1: 12 }, wall: { x0: 36, y0: 1, x1: 56, y1: 3 }, mini: "#b5743a" },
  { id: "hall", name: "Hallway", floor: "cream", dot: "#e6dec9", rect: { x0: 1, y0: 17, x1: 56, y1: 21 }, wall: { x0: 1, y0: 14, x1: 56, y1: 16 }, mini: "#d9ccb0" },
  { id: "standup", name: "Stand-up Room", floor: "blue", dot: "#6f7fb4", rect: { x0: 1, y0: 26, x1: 18, y1: 38 }, wall: { x0: 1, y0: 23, x1: 18, y1: 25 }, mini: "#56649a" },
  { id: "break", name: "Break Room", floor: "wood", dot: "#d08a45", rect: { x0: 20, y0: 26, x1: 36, y1: 38 }, wall: { x0: 20, y0: 23, x1: 36, y1: 25 }, mini: "#c08447" },
  { id: "writers", name: "Writers' Room", floor: "grey", dot: "#9aa3b8", rect: { x0: 38, y0: 26, x1: 56, y1: 38 }, wall: { x0: 38, y0: 23, x1: 56, y1: 25 }, mini: "#8c94aa" },
];

/** Door passages: floor of `room` cut through the walls between it and the hallway. */
export const DOORS: { room: RoomId; rect: Rect }[] = [
  { room: "lab", rect: { x0: 18, y0: 13, x1: 19, y1: 16 } },
  { room: "restroom", rect: { x0: 29, y0: 13, x1: 30, y1: 16 } },
  { room: "review", rect: { x0: 41, y0: 13, x1: 42, y1: 16 } },
  { room: "standup", rect: { x0: 15, y0: 22, x1: 16, y1: 25 } },
  { room: "break", rect: { x0: 27, y0: 22, x1: 28, y1: 25 } },
  { room: "writers", rect: { x0: 44, y0: 22, x1: 45, y1: 25 } },
];

export type FurnitureKind =
  | "table"
  | "desk"
  | "deskBig"
  | "cubicle"
  | "plant"
  | "chair"
  | "shelf"
  | "stall"
  | "sink"
  | "bench"
  | "sign"
  | "frontdesk"
  | "cooler"
  | "printer"
  | "lectern"
  | "pingpong"
  | "arcade"
  | "couch"
  | "tv"
  | "fridge"
  | "rug"
  | "cabinet"
  | "beanbag";

/** x, y = top-left tile; w, h in tiles; solid = blocks walking; color = optional accent. */
export type Furniture = { kind: FurnitureKind; x: number; y: number; w: number; h: number; solid: boolean; color?: string };

const f = (kind: FurnitureKind, x: number, y: number, w: number, h: number, solid = true, color?: string): Furniture => ({ kind, x, y, w, h, solid, color });

export const FURNITURE: Furniture[] = [
  // Research Lab
  f("rug", 4, 5, 11, 6, false, "#3f8a82"),
  f("table", 6, 6, 7, 3),
  ...[6, 8, 10, 12].map((x) => f("chair", x, 5, 1, 1, true, "up")),
  ...[6, 8, 10, 12].map((x) => f("chair", x, 9, 1, 1, true, "down")),
  f("desk", 16, 8, 3, 2, true, "#3d6fd6"),
  f("shelf", 2, 3, 3, 1),
  f("plant", 1, 4, 1, 1),
  f("plant", 21, 4, 1, 1),
  f("plant", 1, 11, 1, 1),
  f("beanbag", 4, 11, 1, 1, true, "#ff8a3d"),
  f("beanbag", 7, 11, 1, 1, true, "#8a6cf0"),
  // Restroom
  ...[25, 27, 29].map((x) => f("stall", x, 3, 2, 2)),
  f("sink", 32, 4, 3, 1),
  f("bench", 27, 10, 4, 1),
  f("plant", 24, 12, 1, 1),
  f("plant", 34, 12, 1, 1),
  // Review Office
  f("rug", 44, 5, 12, 7, false, "#9b2f3a"),
  f("deskBig", 47, 6, 5, 2, true, "#ffd84a"),
  f("chair", 49, 8, 1, 1, true, "up"),
  f("cabinet", 37, 4, 2, 2),
  f("shelf", 53, 3, 3, 1),
  f("plant", 36, 11, 1, 1),
  f("plant", 56, 11, 1, 1),
  f("couch", 38, 9, 3, 2, true, "#5a4a7a"),
  // Hallway
  f("frontdesk", 6, 18, 4, 2),
  f("plant", 11, 17, 1, 1),
  f("cooler", 22, 17, 1, 1),
  f("printer", 24, 17, 2, 1),
  f("plant", 34, 17, 1, 1),
  f("plant", 52, 17, 1, 1),
  // Stand-up Room
  f("lectern", 9, 28, 1, 1),
  ...[3, 4, 5, 6, 10, 11, 12, 13].flatMap((x) => [f("chair", x, 32, 1, 1, false, "down"), f("chair", x, 35, 1, 1, false, "down")]),
  f("plant", 1, 26, 1, 1),
  f("plant", 18, 26, 1, 1),
  f("cabinet", 17, 36, 2, 2),
  // Break Room
  f("pingpong", 22, 30, 5, 3),
  f("arcade", 30, 25, 1, 2),
  f("arcade", 32, 25, 1, 2),
  f("fridge", 35, 25, 1, 2),
  f("couch", 29, 35, 5, 2, true, "#c2413b"),
  f("tv", 30, 33, 3, 1),
  f("plant", 20, 26, 1, 1),
  f("beanbag", 21, 36, 1, 1, true, "#3fb5a5"),
  // Writers' Room
  ...[39, 43, 47, 51].flatMap((x) => [f("cubicle", x, 27, 3, 2), f("cubicle", x, 33, 3, 2)]),
  f("plant", 56, 26, 1, 1),
  f("plant", 38, 38, 1, 1),
  f("cabinet", 55, 36, 2, 2),
];

export type Sign = { text: string; x: number; y: number; bg: string; fg: string };
/** Wall signs, in tiles (painted over the back walls). */
export const SIGNS: Sign[] = [
  { text: "RESEARCH LAB", x: 9, y: 1.4, bg: "#2f6f69", fg: "#e9fff9" },
  { text: "RESTROOM", x: 26.5, y: 1.4, bg: "#3c4f6b", fg: "#dfeaff" },
  { text: "REVIEW OFFICE", x: 41, y: 1.4, bg: "#7a2531", fg: "#ffe3d6" },
  { text: "FRONT DESK", x: 5, y: 14.6, bg: "#ff5c1b", fg: "#fff8ee" },
  { text: "TASK NOTES", x: 14, y: 14.6, bg: "#2f6f69", fg: "#e9fff9" },
  { text: "LEDGER WALL", x: 33, y: 14.6, bg: "#26244a", fg: "#ffd84a" },
  { text: "STAND-UP ROOM", x: 12.4, y: 23.4, bg: "#2d3466", fg: "#dfe3ff" },
  { text: "BREAK ROOM", x: 21.5, y: 23.4, bg: "#8a2f2a", fg: "#ffe0c8" },
  { text: "WRITERS' ROOM", x: 48, y: 23.4, bg: "#2d3466", fg: "#dfe3ff" },
];

export type Dir = "down" | "up" | "left" | "right";
export type Spot = { x: number; y: number; dir: Dir };

/** Where each agent works, and the person's start tile. */
export const SEATS = {
  clerk: { x: 8, y: 17, dir: "down" },
  researcher: { x: 17, y: 10, dir: "up" },
  writer: { x: 40, y: 29, dir: "up" },
  reviewer: { x: 49, y: 5, dir: "down" },
  you: { x: 4, y: 20, dir: "down" },
} satisfies Record<string, Spot>;

/** Tiles in front of the lectern where everyone gathers for a stand-up. */
export const MEETING_SPOTS: Spot[] = [
  { x: 9, y: 30, dir: "up" },
  { x: 7, y: 30, dir: "up" },
  { x: 11, y: 30, dir: "up" },
  { x: 8, y: 31, dir: "up" },
  { x: 10, y: 31, dir: "up" },
];

/** Idle spots in the break room. */
export const BREAK_SPOTS: Spot[] = [
  { x: 21, y: 31, dir: "right" },
  { x: 27, y: 31, dir: "left" },
  { x: 31, y: 32, dir: "down" },
  { x: 34, y: 29, dir: "left" },
  { x: 25, y: 35, dir: "up" },
];

export type HotspotId = "frontdesk" | "researcher" | "writer" | "reviewer" | "board" | "ledger" | "notes" | "elevator";
/** Clickable areas that open a panel (tile rects). */
export const HOTSPOTS: { id: HotspotId; label: string; rect: Rect }[] = [
  { id: "frontdesk", label: "Front desk: assign a task", rect: { x0: 5, y0: 14, x1: 10, y1: 19 } },
  { id: "researcher", label: "Researcher's desk", rect: { x0: 16, y0: 8, x1: 18, y1: 9 } },
  { id: "writer", label: "Writer's cubicle", rect: { x0: 39, y0: 27, x1: 41, y1: 28 } },
  { id: "reviewer", label: "Review desk", rect: { x0: 47, y0: 6, x1: 51, y1: 7 } },
  { id: "board", label: "Task board", rect: { x0: 3, y0: 23, x1: 12, y1: 25 } },
  { id: "ledger", label: "Ledger wall", rect: { x0: 32, y0: 14, x1: 40, y1: 16 } },
  { id: "notes", label: "Task notes: activity timeline", rect: { x0: 13, y0: 14, x1: 21, y1: 16 } },
  { id: "elevator", label: "Elevator: tool permissions", rect: { x0: 1, y0: 14, x1: 4, y1: 16 } },
];

export const inRect = (r: Rect, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/** Room a tile belongs to (door tiles count as the room they lead to). */
export function roomAt(x: number, y: number): Room | null {
  for (const d of DOORS) if (inRect(d.rect, x, y)) return ROOMS.find((r) => r.id === d.room) ?? null;
  return ROOMS.find((r) => inRect(r.rect, x, y)) ?? null;
}

/** Floor type painted on a tile, or null for wall/void. */
export function floorAt(x: number, y: number): Floor | null {
  const r = roomAt(x, y);
  return r ? r.floor : null;
}

let grid: Uint8Array | null = null;
/** 1 = walkable. */
export function walkGrid(): Uint8Array {
  if (grid) return grid;
  const g = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (floorAt(x, y)) g[y * W + x] = 1;
  for (const it of FURNITURE) if (it.solid) for (let y = it.y; y < it.y + it.h; y++) for (let x = it.x; x < it.x + it.w; x++) if (x >= 0 && y >= 0 && x < W && y < H) g[y * W + x] = 0;
  grid = g;
  return g;
}

export const walkable = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && walkGrid()[y * W + x] === 1;

/** Shortest 4-way path from a to b (excluding a), or null. Breadth-first; the grid is small. */
export function findPath(ax: number, ay: number, bx: number, by: number): { x: number; y: number }[] | null {
  if (!walkable(bx, by)) return null;
  if (ax === bx && ay === by) return [];
  const prev = new Int32Array(W * H).fill(-1);
  const start = ay * W + ax;
  prev[start] = start;
  const q = [start];
  for (let i = 0; i < q.length; i++) {
    const cur = q[i];
    const cx = cur % W;
    const cy = (cur - cx) / W;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!walkable(nx, ny)) continue;
      const n = ny * W + nx;
      if (prev[n] !== -1) continue;
      prev[n] = cur;
      if (nx === bx && ny === by) {
        const path: { x: number; y: number }[] = [];
        let k = n;
        while (k !== start) {
          path.push({ x: k % W, y: Math.floor(k / W) });
          k = prev[k];
        }
        return path.reverse();
      }
      q.push(n);
    }
  }
  return null;
}

/** Nearest walkable tile to (x, y), searching outwards. */
export function nearestWalkable(x: number, y: number): { x: number; y: number } {
  const tx = Math.round(x);
  const ty = Math.round(y);
  for (let r = 0; r < 12; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (walkable(tx + dx, ty + dy)) return { x: tx + dx, y: ty + dy };
      }
  return { x: SEATS.you.x, y: SEATS.you.y };
}
