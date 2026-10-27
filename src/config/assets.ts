/*
 * Every image path in one place. All of them are drawn by ../referensi/tools/make-brand.mjs (our own pixel art);
 * a new owner logo or new art only replaces files at these paths, no code edits. The office scene itself is drawn
 * in code (src/lib/office/render.ts and sprites.ts).
 */
export const ASSETS = {
  /** Logo mark (navbar uses a CSS version of the same mark; this is the file version). */
  markSvg: "/brand/mark.svg",
  mark: "/brand/mark.webp",
  /** Square mark on the navy plate (wallet avatar, token avatar). */
  markSquare: "/brand/mark-square.webp",
  /** Square PNG served by Next from src/app/icon.png (structured data needs a PNG logo). */
  logoPng: "/icon.png",
  /** Share card served from src/app/opengraph-image.jpg. */
  og: "/opengraph-image.jpg",
  art: {
    token: { src: "/art/token.webp", w: 288, h: 288, alt: "Pim the clerk at the front desk holding up a yellow coin" },
  },
} as const;
