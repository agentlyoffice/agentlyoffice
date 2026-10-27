import { drawText, textWidth } from "./font";
import { DOORS, FURNITURE, H, ROOMS, SIGNS, TILE, W, floorAt, inRect, type Floor, type Furniture } from "./map";

/*
 * Paints the static office (floors, walls, signs, furniture) into one canvas at 1 px per art pixel.
 * All art is drawn here in code; nothing is loaded from files.
 */

const INK = "#2a2238";
const WALL = "#3a3560";
const WALL_TOP = "#26244a";
const VOID = "#1b1830";

/** Small deterministic noise for floor speckles. */
const noise = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) / 4294967295;
};

const FLOOR: Record<Floor, { base: string; line: string; dot: string }> = {
  teal: { base: "#56a79d", line: "#4b9a90", dot: "#6bbcb1" },
  tiles: { base: "#eef3f8", line: "#cdd8e3", dot: "#dfe7ef" },
  brick: { base: "#8d4b33", line: "#6f3726", dot: "#9c5a3f" },
  cream: { base: "#efe5cc", line: "#dccdab", dot: "#e3d6b8" },
  blue: { base: "#4c5a8f", line: "#43507f", dot: "#5a69a0" },
  wood: { base: "#cf9150", line: "#b0743a", dot: "#dba061" },
  grey: { base: "#8e96aa", line: "#7f879b", dot: "#9aa2b5" },
};

function paintFloor(ctx: CanvasRenderingContext2D, x: number, y: number, kind: Floor) {
  const c = FLOOR[kind];
  const X = x * TILE;
  const Y = y * TILE;
  ctx.fillStyle = c.base;
  ctx.fillRect(X, Y, TILE, TILE);
  ctx.fillStyle = c.line;
  if (kind === "tiles" || kind === "cream") {
    ctx.fillRect(X, Y, TILE, 1);
    ctx.fillRect(X, Y, 1, TILE);
  } else if (kind === "brick") {
    ctx.fillRect(X, Y + 7, TILE, 1);
    ctx.fillRect(X, Y + 15, TILE, 1);
    ctx.fillRect(X + (y % 2 ? 4 : 12), Y, 1, 7);
    ctx.fillRect(X + (y % 2 ? 12 : 4), Y + 8, 1, 7);
  } else if (kind === "wood") {
    ctx.fillRect(X, Y + 5, TILE, 1);
    ctx.fillRect(X, Y + 11, TILE, 1);
    ctx.fillRect(X + ((x * 7 + y * 3) % 16), Y, 1, 5);
  } else if (kind === "grey") {
    if ((x + y) % 2) ctx.fillRect(X, Y, TILE, TILE);
    ctx.fillStyle = c.base;
    ctx.fillRect(X + 1, Y + 1, TILE - 2, TILE - 2);
  }
  ctx.fillStyle = c.dot;
  for (let i = 0; i < 4; i++) {
    const n = noise(x * 4 + i, y * 7 - i);
    if (n > 0.55) ctx.fillRect(X + Math.floor(noise(x + i, y) * 15), Y + Math.floor(noise(y + i, x) * 15), 1, 1);
  }
}

function paintBackWall(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, room: string) {
  const X = x0 * TILE;
  const Y = y0 * TILE;
  const w = (x1 - x0 + 1) * TILE;
  const h = (y1 - y0 + 1) * TILE;
  const paper = room === "restroom" ? ["#e3ecf6", "#d3dfec"] : room === "review" ? ["#f1dccb", "#e5c8b3"] : room === "standup" || room === "writers" ? ["#e6e3f2", "#d6d1e8"] : ["#f4ead3", "#e8d9b9"];
  ctx.fillStyle = paper[0];
  ctx.fillRect(X, Y, w, h);
  ctx.fillStyle = paper[1];
  for (let sx = X + 3; sx < X + w; sx += 8) ctx.fillRect(sx, Y + 4, 3, h - 10);
  ctx.fillStyle = "#6b4a3a";
  ctx.fillRect(X, Y + h - 5, w, 5);
  ctx.fillStyle = "#86604b";
  ctx.fillRect(X, Y + h - 5, w, 1);
  ctx.fillStyle = WALL_TOP;
  ctx.fillRect(X, Y, w, 3);
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, edge = INK) {
  ctx.fillStyle = edge;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
}

function plant(ctx: CanvasRenderingContext2D, X: number, Y: number) {
  box(ctx, X + 4, Y + 9, 8, 7, "#c8653a");
  ctx.fillStyle = "#a8522c";
  ctx.fillRect(X + 5, Y + 14, 6, 1);
  ctx.fillStyle = INK;
  ctx.fillRect(X + 2, Y - 6, 12, 15);
  ctx.fillStyle = "#2f9a52";
  ctx.fillRect(X + 3, Y - 5, 10, 13);
  ctx.fillStyle = "#47b866";
  for (const [a, b] of [
    [4, -4],
    [8, -3],
    [5, 1],
    [10, 2],
    [6, 5],
  ])
    ctx.fillRect(X + a, Y + b, 2, 2);
}

function monitor(ctx: CanvasRenderingContext2D, X: number, Y: number, screen = "#3d6fd6") {
  box(ctx, X, Y, 12, 8, screen);
  ctx.fillStyle = "#9ad0ff";
  ctx.fillRect(X + 2, Y + 2, 5, 1);
  ctx.fillRect(X + 2, Y + 4, 7, 1);
  ctx.fillStyle = INK;
  ctx.fillRect(X + 5, Y + 8, 2, 2);
}

function paintItem(ctx: CanvasRenderingContext2D, it: Furniture) {
  const X = it.x * TILE;
  const Y = it.y * TILE;
  const w = it.w * TILE;
  const h = it.h * TILE;
  switch (it.kind) {
    case "rug":
      ctx.fillStyle = it.color ?? "#3f8a82";
      ctx.fillRect(X, Y, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(X + 3, Y + 3, w - 6, 1);
      ctx.fillRect(X + 3, Y + h - 4, w - 6, 1);
      ctx.fillRect(X + 3, Y + 3, 1, h - 6);
      ctx.fillRect(X + w - 4, Y + 3, 1, h - 6);
      break;
    case "table":
      ctx.fillStyle = INK;
      ctx.fillRect(X + 2, Y + 2, w - 4, h - 2);
      ctx.fillStyle = "#c88648";
      ctx.fillRect(X + 3, Y + 3, w - 6, h - 9);
      ctx.fillStyle = "#a96b33";
      ctx.fillRect(X + 3, Y + h - 6, w - 6, 4);
      ctx.fillStyle = "#fff8ee";
      ctx.fillRect(X + 12, Y + 10, 9, 6);
      ctx.fillRect(X + 40, Y + 14, 8, 6);
      ctx.fillStyle = "#3d6fd6";
      ctx.fillRect(X + 70, Y + 12, 12, 7);
      ctx.fillStyle = "#e8434f";
      ctx.fillRect(X + 56, Y + 22, 3, 3);
      break;
    case "chair": {
      const up = it.color === "up";
      box(ctx, X + 3, Y + (up ? 2 : 6), 10, 9, "#3b3a52");
      ctx.fillStyle = "#525170";
      ctx.fillRect(X + 4, Y + (up ? 3 : 7), 8, 2);
      break;
    }
    case "desk":
    case "deskBig": {
      ctx.fillStyle = INK;
      ctx.fillRect(X, Y + 2, w, h - 2);
      ctx.fillStyle = it.kind === "deskBig" ? "#6b3d2a" : "#d9c39a";
      ctx.fillRect(X + 1, Y + 3, w - 2, h - 8);
      ctx.fillStyle = it.kind === "deskBig" ? "#552f20" : "#bfa67a";
      ctx.fillRect(X + 1, Y + h - 6, w - 2, 5);
      monitor(ctx, X + Math.floor(w / 2) - 6, Y - 3, it.kind === "deskBig" ? "#2fb47a" : (it.color ?? "#3d6fd6"));
      if (it.kind === "deskBig") {
        ctx.fillStyle = it.color ?? "#ffd84a";
        ctx.fillRect(X + 8, Y + 8, 8, 5);
        ctx.fillStyle = INK;
        ctx.fillRect(X + 10, Y + 9, 4, 1);
        ctx.fillStyle = "#fff8ee";
        ctx.fillRect(X + w - 20, Y + 7, 10, 7);
      }
      break;
    }
    case "cubicle":
      ctx.fillStyle = INK;
      ctx.fillRect(X, Y, w, h);
      ctx.fillStyle = "#cfd4e2";
      ctx.fillRect(X + 1, Y + 1, w - 2, 7);
      ctx.fillStyle = "#e9e3d2";
      ctx.fillRect(X + 1, Y + 9, w - 2, h - 13);
      ctx.fillStyle = "#c9c1aa";
      ctx.fillRect(X + 1, Y + h - 4, w - 2, 3);
      monitor(ctx, X + 18, Y + 6, "#2b2f45");
      ctx.fillStyle = "#3fbf8f";
      ctx.fillRect(X + 20, Y + 9, 6, 1);
      ctx.fillStyle = ["#ff5c1b", "#f05aa2", "#3cc4e0"][it.x % 3];
      ctx.fillRect(X + 5, Y + 12, 4, 3);
      break;
    case "plant":
      plant(ctx, X, Y);
      break;
    case "shelf":
      box(ctx, X, Y - 6, w, h + 6, "#7a5236");
      for (let i = 0; i < it.w * 3; i++) {
        ctx.fillStyle = ["#e8434f", "#3d6fd6", "#ffd84a", "#2fb47a", "#f3eff8"][i % 5];
        ctx.fillRect(X + 2 + i * 5, Y - 4, 3, 7);
      }
      break;
    case "stall":
      box(ctx, X + 1, Y - 6, w - 2, h + 4, "#b8c6d6");
      ctx.fillStyle = "#93a5b9";
      ctx.fillRect(X + 3, Y - 2, w - 6, 10);
      ctx.fillStyle = "#3fbf8f";
      ctx.fillRect(X + w - 8, Y + 6, 3, 2);
      break;
    case "sink":
      box(ctx, X, Y, w, h, "#e8eef4");
      for (let i = 0; i < it.w; i++) {
        ctx.fillStyle = "#b9c7d6";
        ctx.fillRect(X + 4 + i * 16, Y + 5, 8, 6);
      }
      break;
    case "bench":
    case "couch": {
      const c = it.kind === "couch" ? (it.color ?? "#5a4a7a") : "#8a6a43";
      box(ctx, X, Y + 2, w, h - 2, c);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(X + 1, Y + h - 5, w - 2, 4);
      break;
    }
    case "frontdesk":
      ctx.fillStyle = INK;
      ctx.fillRect(X, Y + 6, w, h - 6);
      ctx.fillStyle = "#2d3466";
      ctx.fillRect(X + 1, Y + 7, w - 2, h - 8);
      ctx.fillStyle = "#f3eff8";
      ctx.fillRect(X + 1, Y + 6, w - 2, 4);
      drawText(ctx, "TASKS", X + Math.floor((w - textWidth("TASKS")) / 2), Y + 15, "#ffd84a");
      monitor(ctx, X + 6, Y - 2);
      plant(ctx, X + w - 14, Y - 6);
      break;
    case "cooler":
      box(ctx, X + 4, Y - 8, 9, 22, "#e8eef4");
      ctx.fillStyle = "#6fb4ff";
      ctx.fillRect(X + 5, Y - 7, 7, 7);
      ctx.fillStyle = "#e8434f";
      ctx.fillRect(X + 6, Y + 4, 2, 2);
      ctx.fillStyle = "#3d6fd6";
      ctx.fillRect(X + 9, Y + 4, 2, 2);
      break;
    case "printer":
      box(ctx, X + 1, Y - 4, w - 2, 18, "#c6ccd8");
      ctx.fillStyle = "#3a3346";
      ctx.fillRect(X + 4, Y - 1, w - 8, 3);
      ctx.fillStyle = "#fff";
      ctx.fillRect(X + 8, Y + 4, w - 16, 5);
      break;
    case "lectern":
      box(ctx, X + 2, Y - 2, 12, 18, "#7a4a2e");
      ctx.fillStyle = "#ffd84a";
      ctx.fillRect(X + 6, Y + 4, 4, 4);
      break;
    case "pingpong":
      box(ctx, X, Y + 4, w, h - 8, "#2f9a6a");
      ctx.fillStyle = "#fff";
      ctx.fillRect(X + Math.floor(w / 2), Y + 4, 1, h - 8);
      ctx.fillRect(X + 2, Y + Math.floor(h / 2), w - 4, 1);
      ctx.fillStyle = INK;
      ctx.fillRect(X + 4, Y + h - 4, 3, 4);
      ctx.fillRect(X + w - 7, Y + h - 4, 3, 4);
      break;
    case "arcade":
      box(ctx, X, Y - 6, w, h + 6, it.x % 4 ? "#2fb4a5" : "#8f6cf2");
      ctx.fillStyle = "#1b1830";
      ctx.fillRect(X + 3, Y - 3, w - 6, 9);
      ctx.fillStyle = "#3fbf8f";
      ctx.fillRect(X + 5, Y + 1, 2, 2);
      ctx.fillRect(X + 9, Y - 1, 2, 2);
      break;
    case "tv":
      box(ctx, X + 4, Y - 6, w - 8, 14, "#3d6fd6");
      ctx.fillStyle = "#2fb47a";
      ctx.fillRect(X + 6, Y + 2, w - 12, 4);
      ctx.fillStyle = INK;
      ctx.fillRect(X + 4, Y + 8, w - 8, 6);
      break;
    case "fridge":
      box(ctx, X + 1, Y - 6, 14, h + 6, "#eef1f6");
      ctx.fillStyle = "#c8ced9";
      ctx.fillRect(X + 2, Y + 6, 12, 1);
      ctx.fillStyle = "#e8434f";
      ctx.fillRect(X + 4, Y - 2, 3, 3);
      break;
    case "cabinet":
      box(ctx, X + 1, Y - 4, w - 2, h + 2, "#a6aec0");
      ctx.fillStyle = "#7d8597";
      for (let i = 0; i < 3; i++) ctx.fillRect(X + 6, Y + 2 + i * 9, w - 12, 1);
      break;
    case "beanbag":
      ctx.fillStyle = INK;
      ctx.fillRect(X + 1, Y + 4, 14, 11);
      ctx.fillStyle = it.color ?? "#ff8a3d";
      ctx.fillRect(X + 2, Y + 5, 12, 9);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(X + 4, Y + 6, 5, 2);
      break;
    default:
      break;
  }
}

function paintSign(ctx: CanvasRenderingContext2D, text: string, tx: number, ty: number, bg: string, fg: string) {
  const w = textWidth(text) + 8;
  const X = Math.round(tx * TILE);
  const Y = Math.round(ty * TILE);
  ctx.fillStyle = INK;
  ctx.fillRect(X - 1, Y - 1, w + 2, 13);
  ctx.fillStyle = bg;
  ctx.fillRect(X, Y, w, 11);
  drawText(ctx, text, X + 4, Y + 2, fg);
}

/** Wall decorations that are not furniture: windows, boards, elevator, the ledger frame, clocks. */
function paintWallDecor(ctx: CanvasRenderingContext2D) {
  const win = (tx: number, ty: number, tw: number) => {
    const X = tx * TILE;
    const Y = ty * TILE + 4;
    box(ctx, X, Y, tw * TILE, 22, "#9fd2f2");
    ctx.fillStyle = "#c9e8fa";
    ctx.fillRect(X + 3, Y + 3, 6, 2);
    ctx.fillStyle = "#6f8db8";
    for (let i = 0; i < tw * 3; i++) ctx.fillRect(X + 2 + i * 5, Y + 22 - 2 - ((i * 7) % 9), 4, 2 + ((i * 7) % 9));
    ctx.fillStyle = INK;
    ctx.fillRect(X + Math.floor((tw * TILE) / 2), Y, 1, 22);
  };
  win(14, 1, 3);
  win(52, 23, 3);
  // whiteboard in the lab
  box(ctx, 3 * TILE, 1 * TILE + 6, 5 * TILE, 26, "#fbfbff");
  ctx.fillStyle = "#3d6fd6";
  ctx.fillRect(3 * TILE + 6, 1 * TILE + 12, 30, 1);
  ctx.fillRect(3 * TILE + 6, 1 * TILE + 18, 46, 1);
  ctx.fillStyle = "#e8434f";
  ctx.fillRect(3 * TILE + 6, 1 * TILE + 24, 22, 1);
  // task board in the stand-up room
  box(ctx, 3 * TILE, 23 * TILE + 5, 9 * TILE, 30, "#fbfbff");
  const cols = ["#ffd84a", "#3cc4e0", "#f05aa2", "#2fb47a"];
  cols.forEach((c, i) => {
    ctx.fillStyle = c;
    for (let k = 0; k < 3 - (i % 2); k++) ctx.fillRect(3 * TILE + 8 + i * 34, 23 * TILE + 11 + k * 7, 26, 5);
  });
  // elevator
  box(ctx, 2 * TILE, 14 * TILE + 4, 2 * TILE + 8, 44, "#b6bfd0");
  ctx.fillStyle = "#8e98ab";
  ctx.fillRect(2 * TILE + 19, 14 * TILE + 8, 1, 39);
  ctx.fillStyle = "#1b1830";
  ctx.fillRect(2 * TILE + 10, 14 * TILE + 0, 20, 4);
  ctx.fillStyle = "#e8434f";
  ctx.fillRect(2 * TILE + 12, 14 * TILE + 1, 2, 2);
  ctx.fillStyle = "#3fbf8f";
  ctx.fillRect(2 * TILE + 26, 14 * TILE + 1, 2, 2);
  // corkboard of task notes
  box(ctx, 15 * TILE, 15 * TILE - 2, 3 * TILE, 22, "#c08a4f");
  ["#ffd84a", "#f05aa2", "#3cc4e0", "#fff8ee", "#2fb47a"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(15 * TILE + 4 + i * 8, 15 * TILE + 2 + (i % 2) * 7, 6, 6);
  });
  // ledger wall: a framed block chain
  box(ctx, 36 * TILE, 15 * TILE - 4, 2 * TILE, 26, "#26244a", "#ffd84a");
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#ffd84a";
    ctx.fillRect(36 * TILE + 4 + i * 9, 15 * TILE + 4, 6, 6);
    if (i < 2) ctx.fillRect(36 * TILE + 10 + i * 9, 15 * TILE + 6, 3, 2);
  }
  // clocks
  for (const [cx, cy] of [
    [27, 15],
    [1, 24],
    [55, 2],
  ]) {
    box(ctx, cx * TILE + 2, cy * TILE + 1, 12, 12, "#fff8ee");
    ctx.fillStyle = INK;
    ctx.fillRect(cx * TILE + 8, cy * TILE + 3, 1, 5);
    ctx.fillRect(cx * TILE + 8, cy * TILE + 7, 3, 1);
  }
  // neon "CHILL" in the break room
  ctx.fillStyle = "#1b1830";
  ctx.fillRect(22 * TILE, 23 * TILE + 18, 7 * TILE, 14);
  drawText(ctx, "CHILL", 22 * TILE + 26, 23 * TILE + 21, "#ff6ad5");
}

/** Builds the static office canvas (W x H tiles at 1 px per art pixel). */
export function paintOffice(doc: Document): HTMLCanvasElement {
  const c = doc.createElement("canvas");
  c.width = W * TILE;
  c.height = H * TILE;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = VOID;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, c.width, c.height);
  for (const r of ROOMS) if (r.wall) paintBackWall(ctx, r.wall.x0, r.wall.x1, r.wall.y0, r.wall.y1, r.id);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const fl = floorAt(x, y);
      // door passages cut through the back wall strip of the hallway / bottom rooms
      const isWallStrip = ROOMS.some((r) => r.wall && inRect(r.wall, x, y));
      const isDoor = DOORS.some((d) => inRect(d.rect, x, y));
      if (fl && (!isWallStrip || isDoor)) paintFloor(ctx, x, y, fl);
    }
  // thin shadow under every back wall
  ctx.fillStyle = "rgba(27,24,48,0.25)";
  for (const r of ROOMS) if (r.wall) ctx.fillRect(r.rect.x0 * TILE, r.rect.y0 * TILE, (r.rect.x1 - r.rect.x0 + 1) * TILE, 3);
  paintWallDecor(ctx);
  for (const s of SIGNS) paintSign(ctx, s.text, s.x, s.y, s.bg, s.fg);
  const sorted = [...FURNITURE].sort((a, b) => (a.kind === "rug" ? -1 : b.kind === "rug" ? 1 : a.y - b.y));
  for (const it of sorted) paintItem(ctx, it);
  return c;
}

/** Minimap base: one pixel block per tile in room colours. */
export function paintMiniBase(doc: Document, scale: number): HTMLCanvasElement {
  const c = doc.createElement("canvas");
  c.width = W * scale;
  c.height = H * scale;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1b1830";
  ctx.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const r = ROOMS.find((rm) => inRect(rm.rect, x, y)) ?? (DOORS.some((d) => inRect(d.rect, x, y)) ? ROOMS.find((rm) => rm.id === "hall") : null);
      if (!r) continue;
      ctx.fillStyle = r.mini;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  return c;
}
