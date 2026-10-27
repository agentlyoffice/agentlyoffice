import type { Draft, Research, Source, TemplateId } from "./types";

/*
 * The writer's built-in method: fixed templates filled only with the researcher's picks. Every content line carries
 * the [S#] of the sentence it came from. Output is always a draft for a person to read.
 */

export const TEMPLATES: Record<TemplateId, { label: string; what: string; max: number }> = {
  summary: { label: "Summary note", what: "A short note: the brief, the key points with sources, open points.", max: 3_000 },
  announcement: { label: "Announcement draft", what: "A headline, a lead and up to four points for a community post.", max: 1_600 },
  report: { label: "Status report", what: "Context, findings, which source said what, and gaps.", max: 4_000 },
  thread: { label: "Post thread", what: "Numbered posts under 270 characters each, one point per post.", max: 3_000 },
};

const cite = (text: string, source: string) => `${text.replace(/\s+$/, "")} [${source}]`;
const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…`);

export function write(title: string, brief: string, template: TemplateId, research: Research, sources: Source[]): Draft {
  const pts = research.points;
  const label = (id: string) => sources.find((s) => s.id === id)?.label || id;
  const unused = sources.filter((s) => !research.sourcesUsed.includes(s.id)).map((s) => s.id);
  const lines: string[] = [];
  const head = title.trim() || "Untitled task";

  if (template === "summary") {
    lines.push(`Brief: ${brief.trim() || "(no brief)"}`, "", "What the sources say:");
    for (const p of pts) lines.push(`- ${cite(p.text, p.source)}`);
    if (!pts.length) lines.push("- Nothing in the sources matched the brief.");
    if (research.terms.length) lines.push("", `Words that came up most: ${research.terms.slice(0, 6).join(", ")}.`);
    if (unused.length) lines.push("", `Not used: ${unused.join(", ")}.`);
  } else if (template === "announcement") {
    if (pts[0]) lines.push(cite(pts[0].text, pts[0].source));
    if (pts.length > 1) {
      lines.push("");
      for (const p of pts.slice(1, 5)) lines.push(`- ${cite(p.text, p.source)}`);
    }
    if (!pts.length) lines.push("Nothing in the sources matched the brief, so there is nothing to announce yet.");
  } else if (template === "report") {
    lines.push("Context", brief.trim() || "(no brief)", "", "Findings");
    pts.forEach((p, i) => lines.push(`${i + 1}. ${cite(p.text, p.source)}`));
    if (!pts.length) lines.push("No findings: the sources did not match the brief.");
    lines.push("", "Sources");
    for (const s of sources) {
      const n = pts.filter((p) => p.source === s.id).length;
      lines.push(`- ${s.id} ${label(s.id)}: ${n} finding${n === 1 ? "" : "s"}`);
    }
    lines.push("", "Gaps");
    lines.push(research.needsHuman ? `- ${research.needsHuman}` : unused.length ? `- ${unused.join(", ")} added nothing to the brief.` : "- None found by the checklist rules.");
  } else {
    const total = Math.max(1, pts.length);
    pts.forEach((p, i) => {
      const tag = ` [${p.source}]`;
      const prefix = `${i + 1}/${total} `;
      lines.push(`${prefix}${clip(p.text, 270 - prefix.length - tag.length)}${tag}`, "");
    });
    if (!pts.length) lines.push("1/1 Nothing in the sources matched the brief yet.");
  }
  return { by: "template", template, title: head, body: lines.join("\n").trim(), edited: false };
}
