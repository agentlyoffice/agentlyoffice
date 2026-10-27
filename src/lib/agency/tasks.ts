import { LIMITS } from "@/config/ai";
import { hashDoc } from "./canonical";
import { can } from "./permissions";
import { research as runResearcher } from "./researcher";
import { check } from "./reviewer";
import { TEMPLATES, write } from "./writer";
import type { AgentId, ChainFacts, Decision, Draft, KeyPoint, Permissions, Research, Source, Stage, Task, TemplateId } from "./types";

/*
 * The task pipeline as pure functions: every step takes a task and returns the next version of it. The office scene
 * only animates what these functions decide. Order: research -> (person, when sensitive or nothing matched) ->
 * write -> checklist -> person approves -> done. Each step first checks the agent's tool permissions.
 */

export type TaskInput = { title: string; brief: string; template: TemplateId; sensitive: boolean; chainFacts: boolean; sources: { label: string; text: string }[] };

export function validateInput(i: TaskInput): string | null {
  if (i.title.trim().length < 3 || i.title.length > LIMITS.title) return `Give the task a title of 3 to ${LIMITS.title} characters.`;
  if (i.brief.length > LIMITS.brief) return `Keep the brief under ${LIMITS.brief} characters.`;
  if (!(i.template in TEMPLATES)) return "Pick a template.";
  const real = i.sources.filter((s) => s.text.trim());
  if (real.length === 0 && !i.chainFacts) return "Paste at least one source text (or attach live chain facts).";
  if (i.sources.length > LIMITS.sources) return `At most ${LIMITS.sources} sources per task.`;
  for (const s of i.sources) {
    if (s.text.length > LIMITS.sourceText) return `Each source must be under ${LIMITS.sourceText.toLocaleString("en-US")} characters.`;
    if (s.label.length > LIMITS.sourceLabel) return `Source labels must be under ${LIMITS.sourceLabel} characters.`;
  }
  return null;
}

export function newTask(i: TaskInput, permissions: Permissions, now: number, id: string): Task {
  const sources: Source[] = i.sources
    .filter((s) => s.text.trim())
    .map((s, k) => ({ id: `S${k + 1}`, label: s.label.trim() || `Source ${k + 1}`, text: s.text.trim() }));
  return {
    id,
    title: i.title.trim(),
    brief: i.brief.trim(),
    template: i.template,
    sensitive: i.sensitive,
    chainFacts: i.chainFacts,
    sources,
    createdAt: now,
    status: "queued",
    stage: "research",
    blocked: null,
    permissions,
    facts: null,
    research: null,
    draft: null,
    review: null,
    decision: null,
    steps: [],
    revision: 0,
    record: null,
  };
}

/** Which agent owns a stage; "you" for the two places a person decides. */
export function stageOwner(stage: Stage): AgentId | "you" | null {
  if (stage === "research") return "researcher";
  if (stage === "write") return "writer";
  if (stage === "check") return "reviewer";
  if (stage === "gate" || stage === "approval") return "you";
  return null;
}

export function chainSource(f: ChainFacts): Source {
  const parts = [
    f.block === null ? null : `The latest Robinhood Chain block read by the researcher was ${f.block.toLocaleString("en-US")}.`,
    f.gasGwei === null ? null : `The gas price on Robinhood Chain at that moment was ${f.gasGwei} gwei.`,
    f.ethUsd === null ? null : `The Chainlink ETH/USD feed on Robinhood Chain read ${f.ethUsd.toFixed(2)} US dollars per ETH.`,
    `These readings were taken at ${new Date(f.at).toISOString()}.`,
  ].filter(Boolean);
  return { id: "S0", label: "Live Robinhood Chain readings", text: parts.join(" ") };
}

/** Sources the desks work from: the pasted ones, plus S0 when live chain facts were attached. */
export const workingSources = (t: Task): Source[] => (t.chainFacts && t.facts ? [chainSource(t.facts), ...t.sources] : t.sources);

const step = (t: Task, agent: AgentId, stage: Stage, ok: boolean, note: string, now: number) => [...t.steps, { agent, stage, at: now, ok, note }];

const stop = (t: Task, agent: AgentId, stage: Stage, why: string, now: number): Task => ({ ...t, blocked: why, steps: step(t, agent, stage, false, why, now) });

/** Researcher step. `model` = key points proposed by the AI model (used only when model.ai is allowed). */
export function doResearch(t: Task, now: number, opts: { facts?: ChainFacts | null; model?: KeyPoint[] | null } = {}): Task {
  const p = t.permissions;
  if (t.sources.length && !can(p, "researcher", "sources.read")) return stop(t, "researcher", "research", "The researcher is not allowed to read pasted sources.", now);
  if (t.chainFacts && !can(p, "researcher", "chain.read")) return stop(t, "researcher", "research", "The researcher is not allowed to read Robinhood Chain.", now);
  if (opts.model && !can(p, "researcher", "model.ai")) return stop(t, "researcher", "research", "The researcher is not allowed to use the AI model.", now);
  const withFacts: Task = { ...t, facts: t.chainFacts ? (opts.facts ?? null) : null };
  if (t.chainFacts && !withFacts.facts) return stop(t, "researcher", "research", "Live chain readings could not be fetched. Try again in a moment.", now);
  const sources = workingSources(withFacts);
  const base = runResearcher(t.title, t.brief, sources);
  const r: Research = opts.model && opts.model.length ? { ...base, by: "model", points: opts.model, sourcesUsed: [...new Set(opts.model.map((x) => x.source))].sort(), needsHuman: null } : base;
  const next: Stage = t.sensitive || r.needsHuman ? "gate" : "write";
  return {
    ...withFacts,
    blocked: null,
    research: r,
    stage: next,
    status: next === "gate" ? "review" : "running",
    steps: step(t, "researcher", "research", true, `${r.points.length} key point(s) from ${r.sentencesRead} sentence(s)${r.by === "model" ? " (AI model)" : ""}`, now),
  };
}

/** A person lets a sensitive (or unmatched) research result go on to the writer. */
export function passGate(t: Task, now: number): Task {
  if (t.stage !== "gate") return t;
  return { ...t, stage: "write", status: "running", steps: [...t.steps, { agent: "clerk", stage: "gate", at: now, ok: true, note: "Research approved by a person" }] };
}

export function doWrite(t: Task, now: number, model?: string | null): Task {
  if (t.stage !== "write" || !t.research) return t;
  const p = t.permissions;
  if (model) {
    if (!can(p, "writer", "model.ai")) return stop(t, "writer", "write", "The writer is not allowed to use the AI model.", now);
  } else if (!can(p, "writer", "templates")) return stop(t, "writer", "write", "The writer is not allowed to use templates.", now);
  const sources = workingSources(t);
  const draft: Draft = model
    ? { by: "model", template: t.template, title: t.title, body: model.trim().slice(0, LIMITS.draft), edited: false }
    : write(t.title, t.brief, t.template, t.research, sources);
  return { ...t, blocked: null, draft, stage: "check", status: "running", steps: step(t, "writer", "write", true, `${TEMPLATES[t.template].label}, ${draft.body.length} characters${draft.by === "model" ? " (AI model)" : ""}`, now) };
}

export function doCheck(t: Task, now: number): Task {
  if (t.stage !== "check" || !t.draft) return t;
  if (!can(t.permissions, "reviewer", "checklist")) return stop(t, "reviewer", "check", "The reviewer is not allowed to run the checklist.", now);
  const review = check(t.draft, workingSources(t));
  const n = review.items.filter((i) => i.status !== "pass").length;
  return { ...t, blocked: null, review, stage: "approval", status: "review", steps: step(t, "reviewer", "check", true, n ? `${n} item(s) need a look` : "All checklist items pass", now) };
}

/** A person edits the draft at the review desk; the checklist runs again on the new text. */
export function editDraft(t: Task, body: string, now: number): Task {
  if (t.stage !== "approval" || !t.draft) return t;
  const draft = { ...t.draft, body: body.slice(0, LIMITS.draft), edited: true };
  if (!can(t.permissions, "reviewer", "checklist")) return stop({ ...t, draft }, "reviewer", "check", "The reviewer is not allowed to run the checklist.", now);
  return { ...t, draft, review: check(draft, workingSources(t)), steps: step(t, "reviewer", "check", true, "Checklist re-run on the edited draft", now) };
}

export function canApprove(t: Task): boolean {
  return t.stage === "approval" && !!t.review && t.review.verdict !== "blocked" && !t.blocked;
}

export function approve(t: Task, now: number, note: string, approver: string | null): Task {
  if (!canApprove(t)) return t;
  const decision: Decision = { verdict: "approved", note: note.trim().slice(0, LIMITS.note), at: now, approver };
  return { ...t, decision, stage: "done", status: "completed", steps: [...t.steps, { agent: "clerk", stage: "approval", at: now, ok: true, note: "Approved by a person" }] };
}

/** Back to the queue with an edited brief, sources or template; outputs are cleared, the history stays. */
export function sendBack(t: Task, changes: Partial<Pick<TaskInput, "brief" | "template">> & { sources?: Source[] }, now: number): Task {
  if (t.stage === "done") return t;
  return {
    ...t,
    brief: changes.brief?.trim().slice(0, LIMITS.brief) ?? t.brief,
    template: changes.template ?? t.template,
    sources: changes.sources ?? t.sources,
    status: "queued",
    stage: "research",
    blocked: null,
    research: null,
    draft: null,
    review: null,
    revision: t.revision + 1,
    steps: [...t.steps, { agent: "clerk", stage: "research", at: now, ok: true, note: "Sent back to the queue by a person" }],
  };
}

/** After permissions changed: the blocked step may run again with the new set. */
export function retry(t: Task, permissions: Permissions): Task {
  return t.blocked ? { ...t, blocked: null, permissions } : t;
}

/* ---------------------------------------------------------------- files and fingerprints */

export function taskDoc(t: Task) {
  return {
    v: 1,
    kind: "agenly.task",
    id: t.id,
    title: t.title,
    brief: t.brief,
    template: t.template,
    sensitive: t.sensitive,
    chainFacts: t.chainFacts,
    sources: t.sources.map((s) => ({ id: s.id, label: s.label, text: s.text })),
    permissions: t.permissions,
    createdAt: t.createdAt,
    revision: t.revision,
  };
}

export function resultDoc(t: Task) {
  return {
    v: 1,
    kind: "agenly.result",
    facts: t.facts,
    research: t.research ? { by: t.research.by, points: t.research.points.map((p) => ({ text: p.text, source: p.source })) } : null,
    draft: t.draft ? { by: t.draft.by, template: t.draft.template, title: t.draft.title, body: t.draft.body, edited: t.draft.edited } : null,
    checklist: t.review ? t.review.items.map((i) => ({ id: i.id, status: i.status })) : [],
    decision: t.decision,
  };
}

/** Agent steps that ran successfully, capped at the contract's limit. */
export const stepCount = (t: Task) => Math.max(1, Math.min(32, t.steps.filter((s) => s.ok && s.agent !== "clerk").length));

export type Bundle = { format: "agenly.bundle/1"; task: ReturnType<typeof taskDoc>; result: ReturnType<typeof resultDoc>; taskHash: `0x${string}`; resultHash: `0x${string}`; steps: number };

export function bundle(t: Task): Bundle {
  const task = taskDoc(t);
  const result = resultDoc(t);
  return { format: "agenly.bundle/1", task, result, taskHash: hashDoc(task), resultHash: hashDoc(result), steps: stepCount(t) };
}

/** Recomputes both hashes of an exported bundle and says whether they match what the file claims. */
export function checkBundle(raw: unknown): { ok: true; taskHash: `0x${string}`; resultHash: `0x${string}`; steps: number; claimsMatch: boolean; title: string } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Not a JSON object." };
  const b = raw as Partial<Bundle>;
  if (b.format !== "agenly.bundle/1" || !b.task || !b.result) return { ok: false, error: "Not an Agenly task file (format agenly.bundle/1)." };
  try {
    const taskHash = hashDoc(b.task);
    const resultHash = hashDoc(b.result);
    const steps = Number(b.steps);
    return {
      ok: true,
      taskHash,
      resultHash,
      steps: Number.isInteger(steps) && steps >= 1 && steps <= 32 ? steps : 1,
      claimsMatch: b.taskHash === taskHash && b.resultHash === resultHash,
      title: typeof (b.task as { title?: unknown }).title === "string" ? (b.task as { title: string }).title : "",
    };
  } catch {
    return { ok: false, error: "The file could not be hashed (unexpected values)." };
  }
}
