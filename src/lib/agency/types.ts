/* Shared shapes of the office: agents, tools, tasks, desk outputs and the activity timeline. */

export type AgentId = "clerk" | "researcher" | "writer" | "reviewer";
export type ToolId = "sources.read" | "chain.read" | "model.ai" | "templates" | "checklist" | "export";
export type TemplateId = "summary" | "announcement" | "report" | "thread";

export type Source = { id: string; label: string; text: string };

export type ChainFacts = { block: number | null; gasGwei: number | null; ethUsd: number | null; at: number };

export type Permissions = Record<AgentId, ToolId[]>;

export type KeyPoint = { text: string; source: string; score: number };

export type Research = {
  by: "rules" | "model";
  points: KeyPoint[];
  terms: string[];
  sentencesRead: number;
  sourcesUsed: string[];
  /** Set when nothing in the sources answers the brief: a person has to look. */
  needsHuman: string | null;
};

export type Draft = { by: "template" | "model"; template: TemplateId; title: string; body: string; edited: boolean };

export type CheckStatus = "pass" | "warn" | "fail";
export type CheckItem = { id: string; label: string; status: CheckStatus; detail: string };
export type Review = { items: CheckItem[]; verdict: "ready" | "warnings" | "blocked" };

export type TaskStatus = "queued" | "running" | "review" | "completed";
export type Stage = "research" | "gate" | "write" | "check" | "approval" | "done";

export type StepRecord = { agent: AgentId; stage: Stage; at: number; ok: boolean; note: string };

export type Decision = { verdict: "approved"; note: string; at: number; approver: string | null };

export type ChainRecord =
  | { mode: "chain"; id: number; tx: string; approver: string; block: number }
  | { mode: "practice"; signature: string; approver: string; at: number };

export type Task = {
  id: string;
  title: string;
  brief: string;
  template: TemplateId;
  /** Sensitive tasks stop for a person after research, before anything is written. */
  sensitive: boolean;
  /** Attach live Robinhood Chain facts as source S0 (needs chain.read for the researcher). */
  chainFacts: boolean;
  sources: Source[];
  createdAt: number;
  status: TaskStatus;
  stage: Stage;
  /** Last error that stopped the task (e.g. a tool the agent is not allowed to use). */
  blocked: string | null;
  /** Permissions in force when the task was queued (kept with the task, part of its hash). */
  permissions: Permissions;
  facts: ChainFacts | null;
  research: Research | null;
  draft: Draft | null;
  review: Review | null;
  decision: Decision | null;
  steps: StepRecord[];
  revision: number;
  record: ChainRecord | null;
};

export type EventKind = "info" | "handoff" | "error" | "approval" | "chain";
export type ActivityEvent = { id: string; at: number; agent: AgentId | "you"; kind: EventKind; text: string; taskId: string | null };
