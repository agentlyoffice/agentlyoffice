"use client";

import { useState } from "react";
import { agentName, useAgency } from "@/components/office/AgencyProvider";
import { RecordPanel } from "@/components/office/RecordPanel";
import { useWallet } from "@/components/wallet/WalletProvider";
import { canApprove, workingSources } from "@/lib/agency/tasks";
import type { Task } from "@/lib/agency/types";
import { TEMPLATES } from "@/lib/agency/writer";

const STATUS: Record<Task["status"], string> = { queued: "Queued", running: "Running", review: "Review", completed: "Completed" };
const STAGE: Record<Task["stage"], string> = { research: "Research", gate: "Waiting for your OK", write: "Writing", check: "Checklist", approval: "Waiting for your approval", done: "Done" };

/** Everything about one task: what each desk produced, the checklist, and the decisions that are yours. */
export function TaskDetail({ task, focus }: { task: Task; focus?: "researcher" | "writer" | "reviewer" }) {
  const { passGate, editDraft, approve, sendBack, retry, remove, working } = useAgency();
  const { address } = useWallet();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(task.draft?.body ?? "");
  const [note, setNote] = useState("");
  const [brief, setBrief] = useState(task.brief);
  const [backOpen, setBackOpen] = useState(false);
  const busyAgent = (Object.entries(working).find(([, id]) => id === task.id)?.[0] ?? null) as keyof typeof working | null;
  const sources = workingSources(task);

  return (
    <div className="task" data-testid="task-detail">
      <div className="task-head">
        <span className={`tag st-${task.status}`}>{STATUS[task.status]}</span>
        <span className="tag">{STAGE[task.stage]}</span>
        <span className="tag">{TEMPLATES[task.template].label}</span>
        {task.sensitive ? <span className="tag warn">Sensitive</span> : null}
        {task.revision ? <span className="tag">Revision {task.revision}</span> : null}
        {busyAgent ? <span className="tag live">{agentName(busyAgent)} is working</span> : null}
      </div>
      <h3 className="task-title">{task.title}</h3>
      {task.brief ? <p className="task-brief">{task.brief}</p> : null}

      {task.blocked ? (
        <div className="alert" role="alert" data-testid="task-blocked">
          <p>
            <b>Stopped:</b> {task.blocked}
          </p>
          <p className="hint">Change the tool permissions (elevator) and retry, or remove the task.</p>
          <div className="row-btns">
            <button type="button" className="btn sm btn-orange" onClick={() => retry(task.id)} data-testid="task-retry">
              Retry with current permissions
            </button>
          </div>
        </div>
      ) : null}

      <section className={`desk-sec ${focus === "researcher" ? "focus" : ""}`}>
        <h3>Research {task.research ? <em>· {task.research.by === "model" ? "AI model, answers only from the sources" : "built-in extractive method"}</em> : null}</h3>
        {task.research ? (
          <>
            <ul className="points" data-testid="research-points">
              {task.research.points.map((p, i) => (
                <li key={i}>
                  {p.text} <span className="ref">[{p.source}]</span>
                </li>
              ))}
            </ul>
            <p className="hint">
              Read {task.research.sentencesRead} sentence(s) from {sources.length} source(s). {task.research.terms.length ? `Frequent words: ${task.research.terms.join(", ")}.` : ""}
            </p>
            {task.research.needsHuman ? <p className="alert">{task.research.needsHuman}</p> : null}
          </>
        ) : (
          <p className="hint">{task.status === "queued" ? "Waiting in the queue at the front desk." : "Nova is reading the sources…"}</p>
        )}
        {task.stage === "gate" ? (
          <div className="gate" data-testid="gate">
            <p>
              <b>Your OK is needed</b> before {agentName("writer")} writes anything{task.research?.needsHuman ? " (nothing matched the brief)" : " (the task is marked sensitive)"}.
            </p>
            <div className="row-btns">
              <button type="button" className="btn sm btn-orange" onClick={() => passGate(task.id)} data-testid="gate-pass">
                Let the writer continue
              </button>
              <button type="button" className="btn sm btn-cream" onClick={() => setBackOpen(true)}>
                Change the brief
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className={`desk-sec ${focus === "writer" ? "focus" : ""}`}>
        <h3>Draft {task.draft ? <em>· {task.draft.by === "model" ? "AI model" : "template"}{task.draft.edited ? ", edited by you" : ""}</em> : null}</h3>
        {task.draft ? (
          editing ? (
            <>
              <textarea className="input mono" rows={10} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Draft text" data-testid="draft-editor" />
              <div className="row-btns">
                <button
                  type="button"
                  className="btn sm btn-orange"
                  onClick={() => {
                    editDraft(task.id, body);
                    setEditing(false);
                  }}
                  data-testid="draft-save"
                >
                  Save and re-check
                </button>
                <button type="button" className="btn sm btn-cream" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <pre className="draft" data-testid="draft-text">
                {task.draft.body}
              </pre>
              <div className="row-btns">
                <span className="badge-draft">Draft · read before use</span>
                <button type="button" className="btn sm btn-cream" onClick={() => navigator.clipboard?.writeText(task.draft?.body ?? "").catch(() => undefined)}>
                  Copy
                </button>
                {task.stage === "approval" ? (
                  <button
                    type="button"
                    className="btn sm btn-cream"
                    onClick={() => {
                      setBody(task.draft?.body ?? "");
                      setEditing(true);
                    }}
                    data-testid="draft-edit"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            </>
          )
        ) : (
          <p className="hint">{task.stage === "write" ? "Quill is writing…" : "Nothing written yet."}</p>
        )}
      </section>

      <section className={`desk-sec ${focus === "reviewer" ? "focus" : ""}`}>
        <h3>Review checklist</h3>
        {task.review ? (
          <ul className="checklist" data-testid="checklist">
            {task.review.items.map((it) => (
              <li key={it.id} className={it.status}>
                <span className="mark">{it.status === "pass" ? "✓" : it.status === "warn" ? "!" : "×"}</span>
                <span>
                  <b>{it.label}</b> {it.detail}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">{task.stage === "check" ? "Mara is checking…" : "Runs after the draft."}</p>
        )}
        {task.stage === "approval" ? (
          <div className="gate" data-testid="approval">
            <p>
              <b>Human approval.</b> {task.review?.verdict === "blocked" ? "A checklist item failed: edit the draft (or send it back) before it can be approved." : task.review?.verdict === "warnings" ? "Some items need a look. Approve only if you accept them." : "Every item passes."}
            </p>
            <input className="input" placeholder="Note for the record (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} aria-label="Approval note" />
            <div className="row-btns">
              <button type="button" className="btn sm btn-orange" disabled={!canApprove(task)} onClick={() => approve(task.id, note, address)} data-testid="approve">
                Approve
              </button>
              <button type="button" className="btn sm btn-cream" onClick={() => setBackOpen(true)} data-testid="send-back">
                Send back
              </button>
            </div>
          </div>
        ) : null}
        {task.decision ? (
          <p className="ok">
            Approved {new Date(task.decision.at).toLocaleString()}
            {task.decision.note ? `: ${task.decision.note}` : ""}
          </p>
        ) : null}
      </section>

      {backOpen ? (
        <section className="desk-sec" data-testid="send-back-form">
          <h3>Send back with a new brief</h3>
          <textarea className="input" rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} aria-label="New brief" />
          <div className="row-btns">
            <button
              type="button"
              className="btn sm btn-orange"
              onClick={() => {
                sendBack(task.id, { brief });
                setBackOpen(false);
              }}
            >
              Back to the queue
            </button>
            <button type="button" className="btn sm btn-cream" onClick={() => setBackOpen(false)}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {task.status === "completed" ? <RecordPanel task={task} /> : null}

      <section className="desk-sec">
        <h3>Steps</h3>
        <ol className="steps">
          {task.steps.map((s, i) => (
            <li key={i} className={s.ok ? "" : "bad"}>
              <span className="mono">{new Date(s.at).toLocaleTimeString()}</span> {agentName(s.agent)} · {s.note}
            </li>
          ))}
          {!task.steps.length ? <li>No steps yet.</li> : null}
        </ol>
        <details className="srcs">
          <summary>Sources ({sources.length})</summary>
          {sources.map((s) => (
            <div key={s.id}>
              <b>
                {s.id} {s.label}
              </b>
              <p>{s.text}</p>
            </div>
          ))}
        </details>
        <div className="row-btns">
          <button type="button" className="btn sm btn-cream" onClick={() => remove(task.id)} data-testid="task-remove">
            Remove task
          </button>
        </div>
      </section>
    </div>
  );
}
