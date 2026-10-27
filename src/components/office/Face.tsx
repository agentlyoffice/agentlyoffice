"use client";

import { useEffect, useRef } from "react";
import type { Look } from "@/lib/office/look";
import type { Dir } from "@/lib/office/map";
import { SPRITE_H, SPRITE_W, paintCharacter } from "@/lib/office/sprites";

/** A character drawn at 16x24 and shown pixelated at any size by CSS. */
export function Face({ look, dir = "down", badge = false, className, label }: { look: Look; dir?: Dir; badge?: boolean; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
    if (dir === "left") {
      ctx.translate(SPRITE_W, 0);
      ctx.scale(-1, 1);
      paintCharacter(ctx, look, "right", 0, badge);
    } else paintCharacter(ctx, look, dir, 0, badge);
  }, [look, dir, badge]);
  return <canvas ref={ref} width={SPRITE_W} height={SPRITE_H} className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}
