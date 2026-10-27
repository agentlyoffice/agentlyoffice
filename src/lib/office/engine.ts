import { HOTSPOTS, ROOMS, SEATS, TILE, findPath, inRect, nearestWalkable, roomAt, walkable, type Dir, type HotspotId, type RoomId, type Spot } from "./map";
import { paintMiniBase, paintOffice } from "./render";
import { SPRITE_H, SPRITE_W, characterSprite } from "./sprites";
import type { Look } from "./look";

/*
 * The office scene: one canvas, a camera that follows you, characters that walk tile paths, name tags and speech
 * bubbles. It only draws and moves people; what agents do is decided by the task pipeline and pushed in here.
 */

export type ActorKind = "agent" | "you";
export type Actor = {
  id: string;
  kind: ActorKind;
  name: string;
  look: Look;
  /** Position in tiles (float while walking). */
  x: number;
  y: number;
  dir: Dir;
  path: { x: number; y: number }[];
  face: Dir | null;
  speed: number;
  phase: number;
  bubble: { text: string; until: number } | null;
  busy: boolean;
};

export type EngineEvents = {
  onSelectActor: (id: string) => void;
  onHotspot: (id: HotspotId) => void;
  onRoom: (room: RoomId) => void;
};

const INK = "#2a2238";

export class OfficeEngine {
  private ctx: CanvasRenderingContext2D;
  private world: HTMLCanvasElement;
  private mini: HTMLCanvasElement | null = null;
  private miniBase: HTMLCanvasElement | null = null;
  private actors = new Map<string, Actor>();
  private keys = new Set<string>();
  private raf = 0;
  private last = 0;
  private zoom = 3;
  private cam = { x: 0, y: 0 };
  private room: RoomId | null = null;
  private hoverSpot: HotspotId | null = null;
  private highlight: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private pixelFont = "monospace";
  paused = false;
  alarm = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private events: EngineEvents,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.world = paintOffice(document);
    const css = getComputedStyle(document.documentElement).getPropertyValue("--font-pixel").trim();
    if (css) this.pixelFont = css;
    this.zoom = this.defaultZoom();
    this.bind();
  }

  defaultZoom() {
    const w = this.canvas.clientWidth || window.innerWidth;
    return w < 560 ? 2 : 3;
  }

  attachMinimap(c: HTMLCanvasElement | null) {
    this.mini = c;
    if (c && !this.miniBase) this.miniBase = paintMiniBase(document, 4);
  }

  /* ---------------- actors */

  addActor(a: Omit<Actor, "path" | "phase" | "bubble" | "face" | "busy">) {
    this.actors.set(a.id, { ...a, path: [], phase: 0, bubble: null, face: null, busy: false });
    if (a.kind === "you") this.centerOn(a.x, a.y);
  }

  setLook(id: string, look: Look, name?: string) {
    const a = this.actors.get(id);
    if (!a) return;
    a.look = look;
    if (name) a.name = name;
  }

  /** Sends an actor to a spot; returns false when no path exists. */
  goTo(id: string, spot: Spot): boolean {
    const a = this.actors.get(id);
    if (!a) return false;
    const target = walkable(spot.x, spot.y) ? spot : { ...nearestWalkable(spot.x, spot.y), dir: spot.dir };
    const path = findPath(Math.round(a.x), Math.round(a.y), target.x, target.y);
    if (!path) return false;
    a.path = path;
    a.face = spot.dir;
    return true;
  }

  say(id: string, text: string, ms = 3500) {
    const a = this.actors.get(id);
    if (a) a.bubble = { text: text.slice(0, 60), until: performance.now() + ms };
  }

  setBusy(id: string, busy: boolean) {
    const a = this.actors.get(id);
    if (a) a.busy = busy;
  }

  actor(id: string) {
    return this.actors.get(id) ?? null;
  }

  isIdle(id: string) {
    const a = this.actors.get(id);
    return !!a && a.path.length === 0;
  }

  /** Draws a yellow frame around a tile rect (used by the tour); null clears it. */
  frame(rect: { x0: number; y0: number; x1: number; y1: number } | null, focus = true) {
    this.highlight = rect;
    if (rect && focus) this.centerOn((rect.x0 + rect.x1 + 1) / 2, (rect.y0 + rect.y1 + 1) / 2);
  }

  zoomBy(step: number) {
    this.zoom = Math.max(1, Math.min(6, this.zoom + step));
  }

  setZoom(z: number) {
    this.zoom = Math.max(1, Math.min(6, Math.round(z)));
  }

  centerOn(tx: number, ty: number) {
    this.cam.x = tx * TILE;
    this.cam.y = ty * TILE;
  }

  /* ---------------- input */

  private onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (this.paused) return;
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
      this.keys.add(k);
      if (k.startsWith("arrow")) e.preventDefault();
    }
    if (k === "e") {
      const near = this.nearestAgent(2.2);
      if (near) this.events.onSelectActor(near.id);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
  private onBlur = () => this.keys.clear();

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.zoomBy(e.deltaY > 0 ? -1 : 1);
  };

  private toTile(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    const sx = clientX - r.left;
    const sy = clientY - r.top;
    const z = this.zoom;
    return { x: (sx - r.width / 2) / z / TILE + this.cam.x / TILE, y: (sy - r.height / 2) / z / TILE + this.cam.y / TILE };
  }

  private onClick = (e: MouseEvent) => {
    if (this.paused) return;
    const p = this.toTile(e.clientX, e.clientY);
    // characters first (their sprite box is about one tile wide, one and a half tall, feet on the tile)
    for (const a of this.actors.values()) {
      if (a.kind === "you") continue;
      if (p.x >= a.x - 0.1 && p.x <= a.x + 1.1 && p.y >= a.y - 0.9 && p.y <= a.y + 1.1) {
        this.events.onSelectActor(a.id);
        return;
      }
    }
    const tx = Math.floor(p.x);
    const ty = Math.floor(p.y);
    const spot = HOTSPOTS.find((h) => inRect(h.rect, tx, ty));
    if (spot) {
      this.events.onHotspot(spot.id);
      const near = nearestWalkable((spot.rect.x0 + spot.rect.x1) / 2, spot.rect.y1 + 1);
      this.goTo("you", { ...near, dir: "up" });
      return;
    }
    const near = walkable(tx, ty) ? { x: tx, y: ty } : nearestWalkable(tx, ty);
    this.goTo("you", { ...near, dir: "down" });
  };

  private onMove = (e: MouseEvent) => {
    const p = this.toTile(e.clientX, e.clientY);
    const spot = HOTSPOTS.find((h) => inRect(h.rect, Math.floor(p.x), Math.floor(p.y)));
    const overActor = [...this.actors.values()].some((a) => a.kind !== "you" && p.x >= a.x - 0.1 && p.x <= a.x + 1.1 && p.y >= a.y - 0.9 && p.y <= a.y + 1.1);
    this.hoverSpot = spot?.id ?? null;
    this.canvas.style.cursor = spot || overActor ? "pointer" : "default";
    this.canvas.title = spot ? spot.label : "";
  };

  private bind() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("click", this.onClick);
    this.canvas.addEventListener("mousemove", this.onMove);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("click", this.onClick);
    this.canvas.removeEventListener("mousemove", this.onMove);
  }

  private nearestAgent(maxTiles: number) {
    const me = this.actors.get("you");
    if (!me) return null;
    let best: Actor | null = null;
    let bd = maxTiles;
    for (const a of this.actors.values()) {
      if (a.kind !== "agent") continue;
      const d = Math.hypot(a.x - me.x, a.y - me.y);
      if (d <= bd) {
        bd = d;
        best = a;
      }
    }
    return best;
  }

  /* ---------------- loop */

  start() {
    const tick = (t: number) => {
      const dt = Math.min(0.05, this.last ? (t - this.last) / 1000 : 0);
      this.last = t;
      this.update(dt, t);
      this.draw(t);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private update(dt: number, now: number) {
    const me = this.actors.get("you");
    if (me && !this.paused) {
      let dx = 0;
      let dy = 0;
      if (this.keys.has("w") || this.keys.has("arrowup")) dy -= 1;
      if (this.keys.has("s") || this.keys.has("arrowdown")) dy += 1;
      if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
      if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;
      if (dx || dy) {
        me.path = [];
        const sp = (this.keys.has("shift") ? 7.5 : 4.2) * dt;
        const nx = me.x + dx * sp;
        const ny = me.y + dy * sp;
        // collide on the tile under the feet, axis by axis
        if (walkable(Math.round(nx), Math.round(me.y))) me.x = nx;
        if (walkable(Math.round(me.x), Math.round(ny))) me.y = ny;
        me.dir = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
        me.phase += dt * 8;
      }
    }
    for (const a of this.actors.values()) {
      if (a.path.length) {
        const next = a.path[0];
        const ddx = next.x - a.x;
        const ddy = next.y - a.y;
        const dist = Math.hypot(ddx, ddy);
        const step = a.speed * dt;
        if (Math.abs(ddx) > Math.abs(ddy)) a.dir = ddx > 0 ? "right" : "left";
        else if (ddy !== 0) a.dir = ddy > 0 ? "down" : "up";
        if (dist <= step) {
          a.x = next.x;
          a.y = next.y;
          a.path.shift();
          if (!a.path.length && a.face) a.dir = a.face;
        } else {
          a.x += (ddx / dist) * step;
          a.y += (ddy / dist) * step;
        }
        a.phase += dt * 8;
      } else if (a.busy) a.phase += dt * 3;
      if (a.bubble && a.bubble.until < now) a.bubble = null;
    }
    if (me) {
      // camera eases towards you
      const tx = (me.x + 0.5) * TILE;
      const ty = (me.y + 0.5) * TILE;
      if (!this.highlight) {
        this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 6);
        this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 6);
      }
      const r = roomAt(Math.round(me.x), Math.round(me.y));
      if (r && r.id !== this.room) {
        this.room = r.id;
        this.events.onRoom(r.id);
      }
    }
  }

  private draw(now: number) {
    const c = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round(c.clientWidth * dpr);
    const ch = Math.round(c.clientHeight * dpr);
    if (c.width !== cw || c.height !== ch) {
      c.width = cw;
      c.height = ch;
    }
    const ctx = this.ctx;
    const z = this.zoom * dpr;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1b1830";
    ctx.fillRect(0, 0, cw, ch);
    const ox = Math.round(cw / 2 - this.cam.x * z);
    const oy = Math.round(ch / 2 - this.cam.y * z);
    ctx.setTransform(z, 0, 0, z, ox, oy);
    ctx.drawImage(this.world, 0, 0);

    if (this.hoverSpot) {
      const h = HOTSPOTS.find((s) => s.id === this.hoverSpot)!;
      ctx.strokeStyle = "rgba(255,216,74,0.9)";
      ctx.lineWidth = 1;
      ctx.strokeRect(h.rect.x0 * TILE + 0.5, h.rect.y0 * TILE + 0.5, (h.rect.x1 - h.rect.x0 + 1) * TILE - 1, (h.rect.y1 - h.rect.y0 + 1) * TILE - 1);
    }

    const list = [...this.actors.values()].sort((a, b) => a.y - b.y);
    for (const a of list) {
      const moving = a.path.length > 0 || (a.kind === "you" && (this.keys.has("w") || this.keys.has("a") || this.keys.has("s") || this.keys.has("d") || [...this.keys].some((k) => k.startsWith("arrow"))));
      const frame = moving ? Math.floor(a.phase) % 2 : 0;
      const bob = a.busy && !moving ? Math.floor(a.phase) % 2 : 0;
      const spr = characterSprite(a.look, a.dir, frame, a.kind === "agent");
      const px = Math.round(a.x * TILE);
      const py = Math.round(a.y * TILE + TILE - SPRITE_H - bob);
      ctx.fillStyle = "rgba(27,24,48,0.25)";
      ctx.fillRect(px + 3, Math.round(a.y * TILE) + TILE - 2, 10, 2);
      ctx.drawImage(spr, px, py, SPRITE_W, SPRITE_H);
    }

    // labels and bubbles at screen resolution for crisp text
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fontPx = Math.max(10, Math.round(Math.min(15, 3 + this.zoom * 2.6) * dpr));
    ctx.font = `${fontPx}px ${this.pixelFont}, monospace`;
    ctx.textBaseline = "middle";
    for (const a of list) {
      const sx = ox + (a.x * TILE + 8) * z;
      const top = oy + (a.y * TILE + TILE - SPRITE_H) * z;
      const label = a.name;
      const tw = ctx.measureText(label).width;
      const pad = 5 * dpr;
      const hgt = fontPx + 6 * dpr;
      const lx = Math.round(sx - tw / 2 - pad);
      const ly = Math.round(top - hgt - 4 * dpr);
      const bg = a.kind === "you" ? "#ffd84a" : "#26244a";
      ctx.fillStyle = INK;
      ctx.fillRect(lx - dpr, ly - dpr, tw + pad * 2 + 2 * dpr, hgt + 2 * dpr);
      ctx.fillStyle = bg;
      ctx.fillRect(lx, ly, tw + pad * 2, hgt);
      if (a.kind === "agent") {
        ctx.fillStyle = "#ff5c1b";
        ctx.fillRect(lx + 3 * dpr, ly + hgt / 2 - 2 * dpr, 4 * dpr, 4 * dpr);
      }
      ctx.fillStyle = a.kind === "you" ? INK : "#fff8ee";
      ctx.fillText(label, lx + pad + (a.kind === "agent" ? 3 * dpr : 0), ly + hgt / 2 + dpr);
      if (a.bubble) {
        const bt = a.bubble.text;
        const bw = ctx.measureText(bt).width + 14 * dpr;
        const bh = fontPx + 10 * dpr;
        const bx = Math.round(sx - bw / 2);
        const by = Math.round(ly - bh - 8 * dpr);
        ctx.fillStyle = INK;
        ctx.fillRect(bx - 2 * dpr, by - 2 * dpr, bw + 4 * dpr, bh + 4 * dpr);
        ctx.fillStyle = "#fff8ee";
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillRect(Math.round(sx - 3 * dpr), by + bh, 6 * dpr, 4 * dpr);
        ctx.fillStyle = INK;
        ctx.fillText(bt, bx + 7 * dpr, by + bh / 2 + dpr);
      }
    }

    if (this.highlight) {
      const h = this.highlight;
      ctx.strokeStyle = "#ffd84a";
      ctx.lineWidth = 5 * dpr;
      ctx.strokeRect(ox + h.x0 * TILE * z, oy + h.y0 * TILE * z, (h.x1 - h.x0 + 1) * TILE * z, (h.y1 - h.y0 + 1) * TILE * z);
    }
    if (this.alarm && Math.floor(now / 350) % 2 === 0) {
      ctx.fillStyle = "rgba(232,67,79,0.10)";
      ctx.fillRect(0, 0, cw, ch);
    }

    if (this.mini && this.miniBase) {
      const m = this.mini.getContext("2d")!;
      if (this.mini.width !== this.miniBase.width) {
        this.mini.width = this.miniBase.width;
        this.mini.height = this.miniBase.height;
      }
      m.imageSmoothingEnabled = false;
      m.drawImage(this.miniBase, 0, 0);
      for (const a of this.actors.values()) {
        m.fillStyle = a.kind === "you" ? "#ffd84a" : "#ff5c1b";
        m.fillRect(Math.round(a.x * 4), Math.round(a.y * 4), 5, 5);
      }
      m.strokeStyle = "#fff8ee";
      m.lineWidth = 1;
      const vw = cw / z / TILE;
      const vh = ch / z / TILE;
      m.strokeRect((this.cam.x / TILE - vw / 2) * 4 + 0.5, (this.cam.y / TILE - vh / 2) * 4 + 0.5, vw * 4, vh * 4);
    }
  }
}

export { ROOMS, SEATS };
