import type { AgentId, Permissions, ToolId } from "./types";

/* Which tools each agent may use. The pipeline checks these before every step; a missing tool stops the task. */

export const TOOLS: Record<ToolId, { label: string; what: string }> = {
  "sources.read": { label: "Read pasted sources", what: "Read the source texts attached to the task." },
  "chain.read": { label: "Read Robinhood Chain", what: "Attach live block, gas and ETH/USD readings as source S0." },
  "model.ai": { label: "Use the AI model", what: "Send the brief and sources to the configured model (only when the site has one)." },
  templates: { label: "Use writing templates", what: "Fill one of the built-in draft templates." },
  checklist: { label: "Run the review checklist", what: "Check citations, promises, personal data and leftovers." },
  export: { label: "Export task files", what: "Write the task and result as JSON for hashing and sharing." },
};

/** Tools an agent can be given at all (the switches shown in the permissions panel). */
export const OFFERED: Record<AgentId, ToolId[]> = {
  clerk: ["export"],
  researcher: ["sources.read", "chain.read", "model.ai"],
  writer: ["templates", "sources.read", "model.ai"],
  reviewer: ["checklist", "sources.read"],
};

export const DEFAULT_PERMISSIONS: Permissions = {
  clerk: ["export"],
  researcher: ["sources.read", "chain.read"],
  writer: ["templates", "sources.read"],
  reviewer: ["checklist", "sources.read"],
};

export const can = (p: Permissions, agent: AgentId, tool: ToolId) => (p[agent] ?? []).includes(tool);

/** Turns a tool on or off, ignoring tools the agent is never offered. */
export function toggle(p: Permissions, agent: AgentId, tool: ToolId, on: boolean): Permissions {
  if (!OFFERED[agent].includes(tool)) return p;
  const set = new Set(p[agent] ?? []);
  if (on) set.add(tool);
  else set.delete(tool);
  return { ...p, [agent]: OFFERED[agent].filter((t) => set.has(t)) };
}

/** Cleans a stored permissions object: unknown agents and tools are dropped, order follows OFFERED. */
export function sanitize(raw: unknown): Permissions {
  const out = { ...DEFAULT_PERMISSIONS };
  if (!raw || typeof raw !== "object") return out;
  for (const agent of Object.keys(OFFERED) as AgentId[]) {
    const list = (raw as Record<string, unknown>)[agent];
    if (Array.isArray(list)) out[agent] = OFFERED[agent].filter((t) => list.includes(t));
  }
  return out;
}
