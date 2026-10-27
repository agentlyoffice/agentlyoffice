/*
 * Every image path in one place. Brand images come from the owner's artwork (27 Oct 2026), rebuilt by
 * ../referensi/tools/make-owner-brand.mjs from referensi/owner-assets/; new owner files only replace files at these
 * paths, no code edits. The office scene itself is drawn in code (src/lib/office/render.ts and sprites.ts).
 */
export const ASSETS = {
  /** The robot mascot cut out of its navy background (navbar, footer). */
  mark: { src: "/brand/mark.webp", w: 204, h: 256 },
  /** The "AGENTLY" pixel word mark from the banner, transparent (navbar wide logo). */
  wordmark: { src: "/brand/wordmark.webp", w: 439, h: 96 },
  /** The owner's full banner, as sent. */
  banner: { src: "/brand/banner.webp", w: 1500, h: 500 },
  /** Mascot on its navy square (wallet avatar, token avatar). */
  markSquare: "/brand/mark-square.webp",
  /** Square PNG served by Next from src/app/icon.png (structured data needs a PNG logo). */
  logoPng: "/icon.png",
  /** Share card served from src/app/opengraph-image.jpg (the banner letterboxed on navy). */
  og: "/opengraph-image.jpg",
  art: {
    token: { src: "/art/token.webp", w: 458, h: 576, alt: "The Agently robot mascot: a cream box with a dark screen face and a blue badge" },
  },
} as const;
