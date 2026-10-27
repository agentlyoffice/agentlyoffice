import { terms, URL_RE } from "./text";
import { TEMPLATES } from "./writer";
import type { CheckItem, Draft, Review, Source } from "./types";

/*
 * The reviewer's checklist. Rules only, the same on every run: a draft either meets a rule or the item says
 * exactly which line does not. A "fail" blocks approval until the draft is edited; a "warn" is for the person to weigh.
 */

const PROMISE = /\b(guaranteed?|risk[- ]free|can'?t lose|no risk|passive income|profits?|100x|1000x|to the moon|moon(ing)?|returns? of|financial advice|get rich|will (?:pump|moon))\b/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE = /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?){2,4}\d{3,4}\b/;
const LEFTOVER = /\b(TODO|TBD|FIXME|lorem ipsum|xxx+)\b|\{\{|\}\}/i;
const REF = /\[(S\d{1,2})\]/g;

/** Lines that are structure, not claims: headings, the brief echo, the source tally, gaps. */
function isStructure(line: string, section: string): boolean {
  if (/^(Brief:|Words that came up most:|Not used:)/.test(line)) return true;
  if (/^(Context|Findings|Sources|Gaps|What the sources say:)$/.test(line)) return true;
  if (section === "Sources" || section === "Gaps" || section === "Context") return true;
  return line.length < 30 && !/[.!?]$/.test(line);
}

export function check(draft: Draft, sources: Source[]): Review {
  const known = new Map(sources.map((s) => [s.id, new Set(terms(s.text))]));
  const sourceText = sources.map((s) => s.text).join("\n");
  const lines = draft.body.split("\n").map((l) => l.trim());
  const uncited: string[] = [];
  const unknownRefs = new Set<string>();
  const weak: string[] = [];
  let section = "";
  for (const line of lines) {
    if (!line) continue;
    if (/^(Context|Findings|Sources|Gaps)$/.test(line)) section = line;
    const refs = [...line.matchAll(REF)].map((m) => m[1]);
    if (!refs.length) {
      if (!isStructure(line, section)) uncited.push(line);
      continue;
    }
    for (const r of refs) if (!known.has(r)) unknownRefs.add(r);
    const body = terms(line.replace(REF, "").replace(/^\d+\/\d+\s+|^\d+\.\s+|^-\s+/, ""));
    if (body.length === 0) continue;
    const best = Math.max(0, ...refs.filter((r) => known.has(r)).map((r) => body.filter((w) => known.get(r)!.has(w)).length / body.length));
    if (best < 0.6) weak.push(line);
  }

  const items: CheckItem[] = [];
  const short = (s: string) => (s.length > 70 ? `${s.slice(0, 69)}…` : s);
  items.push({
    id: "citations",
    label: "Every claim cites a source",
    status: uncited.length || unknownRefs.size ? "fail" : "pass",
    detail: unknownRefs.size ? `Unknown source ids: ${[...unknownRefs].join(", ")}.` : uncited.length ? `${uncited.length} line(s) without [S#], first: "${short(uncited[0])}"` : "Each content line ends with a source id.",
  });
  items.push({
    id: "grounded",
    label: "Cited words appear in that source",
    status: weak.length ? "warn" : "pass",
    detail: weak.length ? `${weak.length} line(s) share under 60% of their words with the cited source, first: "${short(weak[0])}"` : "Every cited line matches its source.",
  });
  const promise = draft.body.match(PROMISE);
  items.push({ id: "promises", label: "No promises of profit or safety", status: promise ? "fail" : "pass", detail: promise ? `Found "${promise[0]}". Remove it or rephrase as a fact from a source.` : "No promise words found." });
  const email = draft.body.match(EMAIL);
  const phone = draft.body.match(PHONE);
  items.push({
    id: "personal",
    label: "No personal contact data",
    status: email || phone ? "warn" : "pass",
    detail: email ? `Contains an email address (${email[0]}).` : phone ? "Contains something that looks like a phone number." : "No email addresses or phone numbers.",
  });
  const max = TEMPLATES[draft.template].max;
  items.push({ id: "length", label: `Within ${max.toLocaleString("en-US")} characters`, status: draft.body.length > max ? "warn" : "pass", detail: `${draft.body.length.toLocaleString("en-US")} characters.` });
  const left = draft.body.match(LEFTOVER);
  items.push({ id: "leftovers", label: "No placeholders left", status: left ? "fail" : "pass", detail: left ? `Found "${left[0]}".` : "No TODO, TBD or template braces." });
  const links = (draft.body.match(URL_RE) ?? []).filter((u) => !sourceText.includes(u));
  items.push({ id: "links", label: "Links come from the sources", status: links.length ? "warn" : "pass", detail: links.length ? `Not in any source: ${links.slice(0, 2).join(", ")}` : "No outside links." });
  if (draft.template === "thread") {
    const long = lines.filter((l) => /^\d+\/\d+ /.test(l) && l.length > 270);
    items.push({ id: "posts", label: "Each post under 270 characters", status: long.length ? "fail" : "pass", detail: long.length ? `${long.length} post(s) too long.` : "All posts fit." });
  }
  const verdict = items.some((i) => i.status === "fail") ? "blocked" : items.some((i) => i.status === "warn") ? "warnings" : "ready";
  return { items, verdict };
}
