import { HAIR_COLORS, PANTS, SHOES, SKINS, TOP_COLORS, type Look } from "./look";
import type { Dir } from "./map";

/*
 * Characters drawn pixel by pixel into a 16x24 sprite (our own art). Four facings, two walking frames,
 * an optional company badge for agents. Sprites are cached per look/facing/frame.
 */

export const SPRITE_W = 16;
export const SPRITE_H = 24;
const INK = "#2a2238";

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, "0")).join("")}`;
}

type Px = (x: number, y: number, c: string, w?: number, h?: number) => void;

export function paintCharacter(ctx: CanvasRenderingContext2D, look: Look, dir: Dir, frame: number, badge: boolean) {
  const px: Px = (x, y, c, w = 1, h = 1) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  const skin = SKINS[look.skin];
  const hair = HAIR_COLORS[look.hairColor];
  const top = TOP_COLORS[look.topColor];
  const pants = PANTS[look.pants];
  const shoes = SHOES[look.shoes];
  const side = dir === "left" || dir === "right";
  const back = dir === "up";

  // legs + shoes (frame 1 lifts one foot)
  const lift = frame === 1;
  px(4, 19, INK, 8, 3);
  px(5, 19, pants, 6, 2);
  if (!side) {
    px(5, 21, pants, 2, 1);
    px(9, 21, pants, 2, 1);
    px(4, lift ? 21 : 22, INK, 4, 2);
    px(8, lift ? 22 : 21, INK, 4, 2);
    px(5, lift ? 21 : 22, shoes, 2, 1);
    px(9, lift ? 22 : 21, shoes, 2, 1);
  } else {
    px(6, 21, pants, 4, 1);
    px(lift ? 4 : 5, 22, INK, 4, 2);
    px(lift ? 9 : 8, 22, INK, 3, 2);
    px(lift ? 5 : 6, 22, shoes, 2, 1);
    px(lift ? 9 : 8, 22, shoes, 2, 1);
  }

  // body
  px(3, 12, INK, 10, 8);
  px(4, 12, top, 8, 7);
  if (look.top === "stripes") for (const y of [13, 15, 17]) px(4, y, shade(top, 0.72), 8, 1);
  if (look.top === "hoodie") {
    px(4, 12, shade(top, 0.8), 8, 1);
    if (!back && !side) {
      px(6, 13, "#fff8ee");
      px(9, 13, "#fff8ee");
    }
  }
  if (look.top === "jacket" && !back && !side) {
    px(7, 12, "#fff8ee", 2, 7);
    px(6, 12, shade(top, 0.75), 1, 7);
    px(9, 12, shade(top, 0.75), 1, 7);
  }
  // arms
  const sleeve = look.top === "tee" ? skin : top;
  if (!side) {
    px(2, 13, INK, 2, 6);
    px(12, 13, INK, 2, 6);
    px(2, 13, top, 1, 2);
    px(13, 13, top, 1, 2);
    px(2, 15, sleeve, 1, 3);
    px(13, 15, sleeve, 1, 3);
    px(2, 18, skin, 2, 1);
    px(12, 18, skin, 2, 1);
  } else {
    const ax = lift ? 6 : 7;
    px(ax, 13, INK, 3, 6);
    px(ax + 1, 13, shade(top, 0.85), 1, 4);
    px(ax + 1, 17, skin, 1, 1);
  }
  if (badge && !back) px(side ? 9 : 9, 14, "#ffd84a", 2, 2);

  // head
  px(3, 2, INK, 10, 10);
  px(4, 3, skin, 8, 8);
  if (!back) {
    const ex = side ? [9] : [5, 9];
    const flip = dir === "left";
    const mx = (x: number) => (flip ? 15 - x - 1 : x);
    for (const x of ex) {
      const X = side ? mx(x) : x;
      if (look.eyes === "dot") px(X, 6, INK, 1, 2);
      else if (look.eyes === "happy") {
        px(X - (side ? 0 : 0), 6, INK, 2, 1);
      } else if (look.eyes === "sleepy") px(X, 7, INK, 2, 1);
      else if (look.eyes === "big") {
        px(X, 5, "#fff", 2, 3);
        px(X + 1, 6, INK, 1, 2);
      } else {
        if (x === ex[ex.length - 1] && !side) px(X, 7, INK, 2, 1);
        else px(X, 6, INK, 1, 2);
      }
    }
    if (!side) {
      px(7, 9, "#c4475a", 2, 1);
      px(4, 8, "#ff9eb0");
      px(11, 8, "#ff9eb0");
    } else px(mx(11), 9, "#c4475a");
  }

  // hair
  const H = hair;
  const hd = shade(hair, 0.78);
  const fringe = (y: number) => px(4, y, H, 8, 1);
  if (back) {
    px(4, 3, H, 8, look.hair === "buzz" ? 4 : 8);
    if (look.hair === "long" || look.hair === "pony") px(4, 9, H, 8, 4);
    if (look.hair === "bun") px(6, 0, H, 4, 3);
  } else {
    switch (look.hair) {
      case "short":
        px(3, 2, H, 10, 2);
        fringe(4);
        px(4, 5, H, 2, 1);
        break;
      case "long":
        px(3, 2, H, 10, 3);
        px(3, 5, H, 2, 8);
        px(11, 5, H, 2, 8);
        break;
      case "spiky":
        px(3, 2, H, 10, 2);
        for (const x of [3, 6, 9, 12]) px(x, 0, H, 1, 2);
        for (const x of [4, 7, 10]) px(x, 1, H, 2, 1);
        fringe(4);
        break;
      case "bun":
        px(6, 0, H, 4, 2);
        px(3, 2, H, 10, 2);
        fringe(4);
        break;
      case "bob":
        px(3, 2, H, 10, 3);
        px(3, 5, H, 2, 5);
        px(11, 5, H, 2, 5);
        px(4, 5, hd, 8, 1);
        break;
      case "curly":
        px(2, 1, H, 12, 4);
        for (const x of [2, 5, 8, 11]) px(x, 5, H, 2, 1);
        px(2, 6, H, 1, 3);
        px(13, 6, H, 1, 3);
        break;
      case "pony":
        px(3, 2, H, 10, 3);
        px(12, 5, H, 2, 6);
        break;
      default:
        px(4, 2, hd, 8, 2);
    }
    if (side) {
      // the back of the head faces away from the viewing side
      const bx = dir === "right" ? 3 : 11;
      px(bx, 3, H, 2, 6);
    }
  }

  // hats
  const hatColor = TOP_COLORS[(look.topColor + 5) % TOP_COLORS.length];
  switch (look.hat) {
    case "cap":
      px(3, 1, INK, 10, 3);
      px(4, 1, hatColor, 8, 2);
      if (!back) px(side ? (dir === "right" ? 10 : 2) : 4, 3, shade(hatColor, 0.7), side ? 4 : 8, 1);
      break;
    case "beanie":
      px(3, 0, INK, 10, 4);
      px(4, 0, hatColor, 8, 3);
      px(4, 3, shade(hatColor, 0.75), 8, 1);
      break;
    case "bucket":
      px(2, 3, INK, 12, 2);
      px(4, 0, INK, 8, 3);
      px(5, 0, hatColor, 6, 3);
      px(3, 3, hatColor, 10, 1);
      break;
    case "band":
      px(3, 4, hatColor, 10, 1);
      break;
    case "crown":
      px(4, 0, "#ffd84a", 8, 3);
      for (const x of [4, 7, 10]) px(x, 0, "#fff3a8", 1, 1);
      px(4, 3, "#e0a91e", 8, 1);
      break;
    case "bow":
      px(9, 0, "#f05aa2", 4, 3);
      px(10, 1, "#ffd0e6", 2, 1);
      break;
    case "ears":
      px(3, 0, INK, 3, 3);
      px(10, 0, INK, 3, 3);
      px(4, 1, H, 1, 2);
      px(11, 1, H, 1, 2);
      break;
  }
}

const cache = new Map<string, HTMLCanvasElement>();

/** Cached 16x24 canvas of a character (browser only). */
export function characterSprite(look: Look, dir: Dir, frame: number, badge: boolean): HTMLCanvasElement {
  const key = `${JSON.stringify(look)}|${dir}|${frame}|${badge}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = SPRITE_W;
  c.height = SPRITE_H;
  const ctx = c.getContext("2d")!;
  if (dir === "left") {
    ctx.translate(SPRITE_W, 0);
    ctx.scale(-1, 1);
    paintCharacter(ctx, look, "right", frame, badge);
  } else paintCharacter(ctx, look, dir, frame, badge);
  if (cache.size > 400) cache.clear();
  cache.set(key, c);
  return c;
}
