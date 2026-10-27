/* Small text helpers shared by the desks: sentences, words, stop words. Plain English heuristics, no model. */

const STOP = new Set(
  "a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its itself just me more most my no nor not now of off on once only or other our ours out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yet via per may might must shall one two new use used using get got make made many much every within without".split(
    " ",
  ),
);

export const words = (s: string): string[] => (s.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) ?? []).map((w) => w.replace(/'s$/, ""));

/** Content words: three letters or more, not a stop word, not a bare number. */
export const terms = (s: string): string[] => words(s).filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));

/** Splits text into sentences; bullet lines and blank-line breaks also end a sentence. */
export function sentences(text: string): string[] {
  const out: string[] = [];
  for (const block of text.replace(/\r/g, "").split(/\n\s*\n|\n(?=\s*(?:[-*•]|\d+[.)])\s)/)) {
    const flat = block.replace(/\s*\n\s*/g, " ").replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();
    if (!flat) continue;
    const parts = flat.split(/(?<=[.!?])\s+/);
    let carry = "";
    for (const raw of parts) {
      const p = (carry + raw).trim();
      // Abbreviations such as "e.g." or "U.S." should not end a sentence.
      if (/\b(?:e\.g|i\.e|etc|vs|mr|ms|dr|no|u\.s)\.$/i.test(p)) {
        carry = `${p} `;
        continue;
      }
      carry = "";
      if (p) out.push(p);
    }
    if (carry.trim()) out.push(carry.trim());
  }
  return out;
}

export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/gi;
