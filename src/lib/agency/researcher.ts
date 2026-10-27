import { jaccard, sentences, terms } from "./text";
import type { KeyPoint, Research, Source } from "./types";

/*
 * The researcher's built-in method: extractive. It never writes a sentence of its own; it picks the source sentences
 * that best match the brief, scored by brief-term overlap and term rarity, skipping near-repeats, and keeps the
 * source id next to every pick.
 */

export const MAX_POINTS = 6;

type Cand = { text: string; source: string; order: number; t: string[] };

export function research(title: string, brief: string, sources: Source[]): Research {
  const cands: Cand[] = [];
  let order = 0;
  for (const s of sources) {
    for (const sentence of sentences(s.text)) {
      const len = sentence.length;
      if (len < 20 || len > 420) continue;
      cands.push({ text: sentence, source: s.id, order: order++, t: terms(sentence) });
    }
  }
  const query = terms(`${title} ${brief}`);
  const qset = new Set(query);
  const df = new Map<string, number>();
  for (const c of cands) for (const w of new Set(c.t)) df.set(w, (df.get(w) ?? 0) + 1);
  const n = Math.max(1, cands.length);
  const tf = new Map<string, number>();
  for (const c of cands) for (const w of c.t) tf.set(w, (tf.get(w) ?? 0) + 1);

  const scored = cands.map((c) => {
    let s = 0;
    for (const w of new Set(c.t)) {
      const idf = Math.log(1 + n / (df.get(w) ?? 1));
      s += (qset.has(w) ? 3 : 0.25 * Math.min(3, tf.get(w) ?? 0)) * idf;
    }
    const norm = Math.sqrt(Math.max(4, c.t.length));
    return { ...c, score: Math.round((s / norm) * 100) / 100, hits: c.t.filter((w) => qset.has(w)).length };
  });

  const ranked = [...scored].sort((a, b) => b.score - a.score || a.order - b.order);
  const picked: typeof ranked = [];
  for (const c of ranked) {
    if (picked.length >= MAX_POINTS) break;
    if (c.score <= 0) break;
    if (picked.some((p) => jaccard(p.t, c.t) > 0.6)) continue;
    picked.push(c);
  }
  // Back in reading order, so the summary follows the sources.
  picked.sort((a, b) => a.order - b.order);

  const anyHit = picked.some((p) => p.hits > 0);
  const counts = [...tf.entries()].filter(([w]) => (df.get(w) ?? 0) >= 2 || qset.has(w)).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const points: KeyPoint[] = picked.map((p) => ({ text: p.text, source: p.source, score: p.score }));
  return {
    by: "rules",
    points,
    terms: counts.slice(0, 8).map(([w]) => w),
    sentencesRead: cands.length,
    sourcesUsed: [...new Set(points.map((p) => p.source))].sort(),
    needsHuman:
      cands.length === 0
        ? "The sources hold no readable sentences. Paste the text itself, not only a link."
        : query.length > 0 && !anyHit
          ? "No passage in the sources mentions the words of the brief. A person should check the sources or rewrite the brief."
          : null,
  };
}

/** Parses a model's bullet list ("- text [S2]") into key points; lines without a known source id are dropped. */
export function pointsFromModel(text: string, known: Set<string>): KeyPoint[] {
  const out: KeyPoint[] = [];
  for (const line of text.split("\n")) {
    const clean = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();
    const ref = clean.match(/\[(S\d{1,2})\]\s*\.?$/);
    if (!ref || !known.has(ref[1])) continue;
    const body = clean.replace(/\s*\[(S\d{1,2})\]\s*\.?$/, "").trim();
    if (body.length >= 10) out.push({ text: body, source: ref[1], score: 0 });
    if (out.length >= MAX_POINTS) break;
  }
  return out;
}
