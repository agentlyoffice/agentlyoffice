/* Character looks: the option lists of the avatar maker and helpers to keep a stored look valid. */

export const SKINS = ["#ffe3c9", "#f6c79f", "#dda070", "#b47a4c", "#f9e8de", "#7b4b2d"] as const;
export const HAIRS = ["short", "long", "spiky", "bun", "bob", "curly", "pony", "buzz"] as const;
export const HAIR_COLORS = ["#3a3248", "#7b4a26", "#f2c45c", "#df5a35", "#f39ac7", "#5b8cf0", "#ebe7f7", "#3fbf8f", "#222033", "#9b78f2", "#ff9a3c"] as const;
export const TOPS = ["tee", "stripes", "hoodie", "jacket"] as const;
export const TOP_COLORS = ["#ff6a2b", "#f05aa2", "#3cc4e0", "#8f6cf2", "#2fb47a", "#ffbe3d", "#3d4f8c", "#f3eff8", "#3a3346", "#e8434f", "#ffd84a", "#1fa59a"] as const;
export const PANTS = ["#3c4b84", "#4a3f36", "#5a5f6e", "#2b2838", "#b8925e", "#c4483c", "#e6e1d2", "#e88fb5"] as const;
export const SHOES = ["#5b3a26", "#f2efe8", "#2b2838", "#d9493b", "#ffd23f", "#4d7cf0"] as const;
export const HATS = ["none", "cap", "beanie", "bucket", "band", "crown", "bow", "ears"] as const;
export const EYES = ["dot", "happy", "sleepy", "big", "wink"] as const;

export type Look = {
  skin: number;
  hair: (typeof HAIRS)[number];
  hairColor: number;
  top: (typeof TOPS)[number];
  topColor: number;
  pants: number;
  shoes: number;
  hat: (typeof HATS)[number];
  eyes: (typeof EYES)[number];
};

export const DEFAULT_LOOK: Look = { skin: 1, hair: "bob", hairColor: 9, top: "hoodie", topColor: 3, pants: 3, shoes: 2, hat: "none", eyes: "dot" };

const pick = <T,>(list: readonly T[], r: () => number) => list[Math.floor(r() * list.length)];
const idx = (n: number, r: () => number) => Math.floor(r() * n);

export function randomLook(r: () => number = Math.random): Look {
  return {
    skin: idx(SKINS.length, r),
    hair: pick(HAIRS, r),
    hairColor: idx(HAIR_COLORS.length, r),
    top: pick(TOPS, r),
    topColor: idx(TOP_COLORS.length, r),
    pants: idx(PANTS.length, r),
    shoes: idx(SHOES.length, r),
    hat: r() < 0.45 ? "none" : pick(HATS, r),
    eyes: pick(EYES, r),
  };
}

const okIndex = (v: unknown, n: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;

/** A stored look with every field checked; anything unknown falls back to the default. */
export function sanitizeLook(raw: unknown): Look {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_LOOK;
  return {
    skin: okIndex(o.skin, SKINS.length) ? (o.skin as number) : d.skin,
    hair: HAIRS.includes(o.hair as Look["hair"]) ? (o.hair as Look["hair"]) : d.hair,
    hairColor: okIndex(o.hairColor, HAIR_COLORS.length) ? (o.hairColor as number) : d.hairColor,
    top: TOPS.includes(o.top as Look["top"]) ? (o.top as Look["top"]) : d.top,
    topColor: okIndex(o.topColor, TOP_COLORS.length) ? (o.topColor as number) : d.topColor,
    pants: okIndex(o.pants, PANTS.length) ? (o.pants as number) : d.pants,
    shoes: okIndex(o.shoes, SHOES.length) ? (o.shoes as number) : d.shoes,
    hat: HATS.includes(o.hat as Look["hat"]) ? (o.hat as Look["hat"]) : d.hat,
    eyes: EYES.includes(o.eyes as Look["eyes"]) ? (o.eyes as Look["eyes"]) : d.eyes,
  };
}

/** Seeded generator (mulberry32) for reproducible looks. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The four office agents' fixed looks and names (our own characters). */
export const AGENT_LOOKS = {
  clerk: { skin: 2, hair: "pony", hairColor: 1, top: "jacket", topColor: 6, pants: 3, shoes: 0, hat: "none", eyes: "happy" },
  researcher: { skin: 0, hair: "curly", hairColor: 3, top: "stripes", topColor: 4, pants: 0, shoes: 1, hat: "none", eyes: "big" },
  writer: { skin: 3, hair: "bun", hairColor: 8, top: "tee", topColor: 0, pants: 4, shoes: 2, hat: "beanie", eyes: "dot" },
  reviewer: { skin: 5, hair: "short", hairColor: 0, top: "jacket", topColor: 9, pants: 3, shoes: 5, hat: "none", eyes: "sleepy" },
} satisfies Record<string, Look>;
