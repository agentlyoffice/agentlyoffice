"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocalStore } from "@/components/wallet/useLocalStore";
import { storageKey } from "@/config/storage";
import { DEFAULT_PERMISSIONS, can, sanitize } from "@/lib/agency/permissions";
import { pointsFromModel } from "@/lib/agency/researcher";
import { approve as approveTask, doCheck, doResearch, doWrite, editDraft as editTask, newTask, passGate, retry as retryTask, sendBack as sendTaskBack, stageOwner, validateInput, workingSources, type TaskInput } from "@/lib/agency/tasks";
import type { ActivityEvent, AgentId, ChainFacts, ChainRecord, EventKind, KeyPoint, Permissions, Source, Task } from "@/lib/agency/types";
import { DEFAULT_LOOK, sanitizeLook, type Look } from "@/lib/office/look";

/*
 * The office's state, kept in this browser: tasks, tool permissions, the activity timeline and your visitor look.
 * A small runner hands each task to the agent whose stage it is, waits for the desk to finish (a short working time,
 * and the optional AI model when the agent is allowed to use it) and applies the pure pipeline step.
 */

export const AGENTS: { id: AgentId; name: string; role: string; desk: string }[] = [
  { id: "clerk", name: "Pim", role: "Front desk clerk", desk: "Front desk" },
  { id: "researcher", name: "Nova", role: "Researcher", desk: "Research Lab" },
  { id: "writer", name: "Quill", role: "Writer", desk: "Writers' Room" },
  { id: "reviewer", name: "Mara", role: "Reviewer", desk: "Review Office" },
];
export const agentName = (id: AgentId | "you") => (id === "you" ? "You" : (AGENTS.find((a) => a.id === id)?.name ?? id));

const MAX_TASKS = 30;
const MAX_EVENTS = 300;
const WORK_MS: Record<"researcher" | "writer" | "reviewer", number> = { researcher: 4200, writer: 3600, reviewer: 2600 };

export type Me = { name: string; look: Look };
type Working = Partial<Record<AgentId, string>>;

type Ctx = {
  tasks: Task[];
  permissions: Permissions;
  setPermissions: (p: Permissions) => void;
  events: ActivityEvent[];
  log: (agent: ActivityEvent["agent"], kind: EventKind, text: string, taskId?: string | null) => void;
  clearEvents: () => void;
  me: Me | null;
  setMe: (m: Me) => void;
  working: Working;
  aiConfigured: boolean | null;
  createTask: (i: TaskInput) => { ok: true; id: string } | { ok: false; error: string };
  passGate: (id: string) => void;
  editDraft: (id: string, body: string) => void;
  approve: (id: string, note: string, approver: string | null) => void;
  sendBack: (id: string, changes: { brief?: string; sources?: Source[] }) => void;
  retry: (id: string) => void;
  remove: (id: string) => void;
  setRecord: (id: string, r: ChainRecord) => void;
};

const AgencyCtx = createContext<Ctx | null>(null);

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

async function fetchFacts(): Promise<ChainFacts | null> {
  try {
    const r = await fetch("/api/chain", { cache: "no-store" });
    const v = (await r.json()) as { block: number | null; gasGwei: number | null; ethUsd: number | null };
    if (v.block === null) return null;
    return { block: v.block, gasGwei: v.gasGwei === null ? null : Math.round(v.gasGwei * 10_000) / 10_000, ethUsd: v.ethUsd, at: Date.now() };
  } catch {
    return null;
  }
}

async function askDesk(role: "researcher" | "writer", t: Task, points: KeyPoint[]): Promise<string | null> {
  try {
    const r = await fetch("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role, title: t.title, brief: t.brief, template: t.template, sources: workingSources(t), points: points.map((p) => ({ text: p.text, source: p.source })) }),
    });
    const v = (await r.json()) as { configured?: boolean; text?: string; error?: string };
    return v.configured && typeof v.text === "string" ? v.text : null;
  } catch {
    return null;
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AgencyProvider({ children }: { children: React.ReactNode }) {
  const [rawTasks, setTasks] = useLocalStore<Task[]>(storageKey("tasks"), []);
  const [rawPerms, setPerms] = useLocalStore<Permissions>(storageKey("permissions"), DEFAULT_PERMISSIONS);
  const [rawEvents, setEvents] = useLocalStore<ActivityEvent[]>(storageKey("timeline"), []);
  const [rawMe, setRawMe] = useLocalStore<Me | null>(storageKey("me"), null);
  const [working, setWorking] = useState<Working>({});
  const [aiConfigured, setAi] = useState<boolean | null>(null);
  const busy = useRef<Working>({});

  const tasks = useMemo(() => (Array.isArray(rawTasks) ? rawTasks : []), [rawTasks]);
  const permissions = useMemo(() => sanitize(rawPerms), [rawPerms]);
  const events = useMemo(() => (Array.isArray(rawEvents) ? rawEvents : []), [rawEvents]);
  const me = useMemo<Me | null>(() => (rawMe && typeof rawMe === "object" && typeof rawMe.name === "string" ? { name: rawMe.name.slice(0, 16), look: sanitizeLook(rawMe.look) } : null), [rawMe]);

  useEffect(() => {
    fetch("/api/agent", { cache: "no-store" })
      .then((r) => r.json())
      .then((v: { configured?: boolean }) => setAi(Boolean(v.configured)))
      .catch(() => setAi(false));
  }, []);

  const log = useCallback(
    (agent: ActivityEvent["agent"], kind: EventKind, text: string, taskId: string | null = null) =>
      setEvents((prev) => [{ id: uid(), at: Date.now(), agent, kind, text: text.slice(0, 240), taskId }, ...(Array.isArray(prev) ? prev : [])].slice(0, MAX_EVENTS)),
    [setEvents],
  );

  const update = useCallback((id: string, fn: (t: Task) => Task) => setTasks((prev) => (Array.isArray(prev) ? prev : []).map((t) => (t.id === id ? fn(t) : t))), [setTasks]);

  const createTask = useCallback<Ctx["createTask"]>(
    (input) => {
      const error = validateInput(input);
      if (error) return { ok: false, error };
      const id = uid();
      const t = newTask(input, permissions, Date.now(), id);
      setTasks((prev) => [t, ...(Array.isArray(prev) ? prev : [])].slice(0, MAX_TASKS));
      log("clerk", "info", `Queued "${t.title}" with ${t.sources.length} source(s)${t.sensitive ? ", marked sensitive" : ""}.`, id);
      return { ok: true, id };
    },
    [permissions, setTasks, log],
  );

  // The runner: one step at a time per agent.
  const tasksRef = useRef(tasks);
  const aiRef = useRef(aiConfigured);
  useEffect(() => {
    tasksRef.current = tasks;
    aiRef.current = aiConfigured;
  }, [tasks, aiConfigured]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      for (const agent of ["researcher", "writer", "reviewer"] as const) {
        if (busy.current[agent]) continue;
        const next = [...tasksRef.current]
          .reverse()
          .find((t) => !t.blocked && stageOwner(t.stage) === agent && (t.status === "queued" || t.status === "running"));
        if (!next) continue;
        busy.current = { ...busy.current, [agent]: next.id };
        setWorking({ ...busy.current });
        void (async () => {
          const started = Date.now();
          if (next.status === "queued") {
            setTasks((prev) => prev.map((t) => (t.id === next.id ? { ...t, status: "running" } : t)));
            log("clerk", "handoff", `Handed "${next.title}" to ${agentName("researcher")} at the Research Lab.`, next.id);
          }
          let after: Task | null = null;
          const cur = tasksRef.current.find((t) => t.id === next.id) ?? next;
          if (agent === "researcher") {
            const facts = cur.chainFacts && can(cur.permissions, "researcher", "chain.read") ? await fetchFacts() : null;
            let model: KeyPoint[] | null = null;
            const useAi = aiRef.current && can(cur.permissions, "researcher", "model.ai");
            if (useAi) {
              const text = await askDesk("researcher", { ...cur, facts }, []);
              const known = new Set(workingSources({ ...cur, facts }).map((s) => s.id));
              model = text ? pointsFromModel(text, known) : null;
              if (!model?.length) {
                model = null;
                log("researcher", "error", "The AI model gave no usable points; used the built-in extractive method instead.", cur.id);
              }
            }
            await wait(Math.max(0, WORK_MS.researcher - (Date.now() - started)));
            after = doResearch(tasksRef.current.find((t) => t.id === next.id) ?? cur, Date.now(), { facts, model });
          } else if (agent === "writer") {
            let text: string | null = null;
            if (aiRef.current && can(cur.permissions, "writer", "model.ai") && cur.research) {
              text = await askDesk("writer", cur, cur.research.points);
              if (!text) log("writer", "error", "The AI model gave no draft; used the built-in template instead.", cur.id);
            }
            await wait(Math.max(0, WORK_MS.writer - (Date.now() - started)));
            after = doWrite(tasksRef.current.find((t) => t.id === next.id) ?? cur, Date.now(), text);
          } else {
            await wait(WORK_MS.reviewer);
            after = doCheck(tasksRef.current.find((t) => t.id === next.id) ?? cur, Date.now());
          }
          if (after) {
            const done = after;
            setTasks((prev) => prev.map((t) => (t.id === done.id ? done : t)));
            const last = done.steps.at(-1);
            if (done.blocked) log(agent, "error", `Stopped on "${done.title}": ${done.blocked}`, done.id);
            else if (last) log(agent, "info", `${last.note} for "${done.title}".`, done.id);
            if (!done.blocked) {
              if (done.stage === "write") log(agent, "handoff", `Passed "${done.title}" to ${agentName("writer")} in the Writers' Room.`, done.id);
              if (done.stage === "gate") log(agent, "approval", done.research?.needsHuman ? `Needs a person: ${done.research.needsHuman}` : `"${done.title}" is sensitive: waiting for your OK before writing.`, done.id);
              if (done.stage === "check") log(agent, "handoff", `Passed the draft of "${done.title}" to ${agentName("reviewer")} at the Review Office.`, done.id);
              if (done.stage === "approval") log(agent, "approval", `"${done.title}" is at the review desk, waiting for your decision.`, done.id);
            }
          }
          busy.current = { ...busy.current, [agent]: undefined };
          setWorking({ ...busy.current });
        })();
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [setTasks, log]);

  const value = useMemo<Ctx>(
    () => ({
      tasks,
      permissions,
      setPermissions: (p) => {
        setPerms(p);
        log("you", "info", "Tool permissions changed.");
      },
      events,
      log,
      clearEvents: () => setEvents([]),
      me,
      setMe: (m) => setRawMe({ name: m.name.trim().slice(0, 16), look: m.look }),
      working,
      aiConfigured,
      createTask,
      passGate: (id) => {
        update(id, (t) => passGate(t, Date.now()));
        log("you", "approval", "Let the research go on to the writer.", id);
      },
      editDraft: (id, body) => {
        update(id, (t) => editTask(t, body, Date.now()));
        log("you", "info", "Edited the draft; the checklist ran again.", id);
      },
      approve: (id, note, approver) => {
        update(id, (t) => approveTask(t, Date.now(), note, approver));
        log("you", "approval", `Approved the result${note ? `: ${note}` : "."}`, id);
      },
      sendBack: (id, changes) => {
        update(id, (t) => sendTaskBack(t, changes, Date.now()));
        log("you", "handoff", "Sent the task back to the queue with changes.", id);
      },
      retry: (id) => {
        update(id, (t) => retryTask(t, permissions));
        log("you", "info", "Retried with the current tool permissions.", id);
      },
      remove: (id) => setTasks((prev) => prev.filter((t) => t.id !== id)),
      setRecord: (id, r) => {
        update(id, (t) => ({ ...t, record: r }));
        log("you", "chain", r.mode === "chain" ? `Recorded on Robinhood Chain as record #${r.id}.` : "Signed a practice approval (kept in this browser).", id);
      },
    }),
    [tasks, permissions, events, log, me, working, aiConfigured, createTask, update, setPerms, setEvents, setRawMe, setTasks],
  );
  return <AgencyCtx.Provider value={value}>{children}</AgencyCtx.Provider>;
}

export function useAgency() {
  const c = useContext(AgencyCtx);
  if (!c) throw new Error("useAgency must be used inside AgencyProvider");
  return c;
}

export const visitorLook = (me: Me | null) => me?.look ?? DEFAULT_LOOK;
