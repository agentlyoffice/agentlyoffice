"use client";

import { useState } from "react";
import { AGENTS, useAgency } from "@/components/office/AgencyProvider";
import { Face } from "@/components/office/Face";
import { Modal } from "@/components/office/Modal";
import { LIMITS } from "@/config/ai";
import { can } from "@/lib/agency/permissions";
import type { TemplateId } from "@/lib/agency/types";
import { TEMPLATES } from "@/lib/agency/writer";
import { AGENT_LOOKS } from "@/lib/office/look";

/** Example material, invented for the demo and labelled as such in the dialog. */
const EXAMPLE = {
  title: "Garden club weekend plan",
  brief: "What happens at the garden club this weekend, and what should volunteers bring?",
  sources: [
    {
      label: "Club notice (example)",
      text: "The community garden opens for planting on Saturday at nine in the morning. Volunteers should bring gloves and a water bottle. Seedlings for the herb beds arrive on Friday evening and are kept in the shed. The compost bins on the east side are full, so new garden waste goes to the bins by the gate.",
    },
    {
      label: "Group chat summary (example)",
      text: "- Sunday is reserved for repairing the raised beds near the fence.\n- Tools are in the shed; the key is with the coordinator at the entrance.\n- Children are welcome in the herb beds if an adult stays with them.\n- Rain is likely on Sunday afternoon, so the repair work starts early.",
    },
  ],
};

type Src = { label: string; text: string };

export function AssignDialog({ onClose, onQueued }: { onClose: () => void; onQueued: (id: string) => void }) {
  const { createTask, permissions, aiConfigured } = useAgency();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [template, setTemplate] = useState<TemplateId>("summary");
  const [sources, setSources] = useState<Src[]>([{ label: "", text: "" }]);
  const [chainFacts, setChainFacts] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [err, setErr] = useState("");
  const clerk = AGENTS[0];

  const setSrc = (i: number, patch: Partial<Src>) => setSources((list) => list.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const submit = () => {
    const out = createTask({ title, brief, template, sources, chainFacts, sensitive });
    if (!out.ok) return setErr(out.error);
    onQueued(out.id);
  };
  const usesAi = (agent: "researcher" | "writer") => aiConfigured === true && can(permissions, agent, "model.ai");

  return (
    <Modal title="Assign a task" wide onClose={onClose} testid="assign-dialog" sub="The task goes to the front desk queue. The researcher reads your sources, the writer drafts, the reviewer runs the checklist, and you approve at the end. Everything stays in this browser unless the AI model is switched on.">
      <div className="maker">
        <div className="maker-left">
          <div className="stagebox">
            <Face look={AGENT_LOOKS.clerk} badge label={`${clerk.name}, the front desk clerk`} />
          </div>
          <p className="hint center">
            <strong>{clerk.name}</strong> takes the task and hands it on.
          </p>
          <ul className="flow">
            {AGENTS.slice(1).map((a) => (
              <li key={a.id}>
                <Face look={AGENT_LOOKS[a.id as keyof typeof AGENT_LOOKS]} badge className="flow-face" />
                <span>
                  <b>{a.name}</b> {a.role.toLowerCase()}
                  {a.id !== "reviewer" ? <em>{usesAi(a.id as "researcher" | "writer") ? " · AI model" : " · built-in"}</em> : <em> · checklist</em>}
                </span>
              </li>
            ))}
            <li>
              <span className="flow-you">You</span>
              <span>approve at the review desk</span>
            </li>
          </ul>
        </div>
        <div>
          <label className="lbl" htmlFor="t-title">
            Task title
          </label>
          <input id="t-title" className="input" maxLength={LIMITS.title} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What should the office work on?" data-testid="assign-title" />
          <label className="lbl" htmlFor="t-brief">
            Brief <span className="opt">(what the answer must cover)</span>
          </label>
          <textarea id="t-brief" className="input" rows={2} maxLength={LIMITS.brief} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="The question, in one or two sentences" data-testid="assign-brief" />
          <span className="lbl">Template</span>
          <div className="mopts" role="radiogroup" aria-label="Template">
            {(Object.keys(TEMPLATES) as TemplateId[]).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={template === t} className={`swt ${template === t ? "on" : ""}`} onClick={() => setTemplate(t)} title={TEMPLATES[t].what}>
                {TEMPLATES[t].label}
              </button>
            ))}
          </div>
          <p className="hint">{TEMPLATES[template].what}</p>

          <span className="lbl">Sources</span>
          <div className="sources">
            {sources.map((s, i) => (
              <div key={i} className="source">
                <div className="source-head">
                  <b>S{i + 1}</b>
                  <input className="input sm" aria-label={`Label of source ${i + 1}`} maxLength={LIMITS.sourceLabel} value={s.label} onChange={(e) => setSrc(i, { label: e.target.value })} placeholder="Label (where it came from)" />
                  {sources.length > 1 ? (
                    <button type="button" className="btn sm btn-cream" onClick={() => setSources((l) => l.filter((_, k) => k !== i))} aria-label={`Remove source ${i + 1}`}>
                      Remove
                    </button>
                  ) : null}
                </div>
                <textarea className="input" rows={4} aria-label={`Text of source ${i + 1}`} maxLength={LIMITS.sourceText} value={s.text} onChange={(e) => setSrc(i, { text: e.target.value })} placeholder="Paste the text itself (notes, an article, a changelog). Links alone are not read." data-testid={`assign-source-${i}`} />
              </div>
            ))}
          </div>
          <div className="row-btns">
            {sources.length < LIMITS.sources ? (
              <button type="button" className="btn sm btn-cream" onClick={() => setSources((l) => [...l, { label: "", text: "" }])}>
                + Add a source
              </button>
            ) : null}
            <button
              type="button"
              className="btn sm btn-cream"
              data-testid="assign-example"
              onClick={() => {
                setTitle(EXAMPLE.title);
                setBrief(EXAMPLE.brief);
                setSources(EXAMPLE.sources.map((s) => ({ ...s })));
              }}
            >
              Fill an example
            </button>
          </div>

          <label className="check">
            <input type="checkbox" checked={chainFacts} onChange={(e) => setChainFacts(e.target.checked)} />
            <span>
              Attach live Robinhood Chain readings as source S0 <em>(block, gas, ETH/USD; needs the researcher&apos;s chain tool)</em>
            </span>
          </label>
          <label className="check">
            <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} data-testid="assign-sensitive" />
            <span>
              Sensitive: stop after research and wait for my OK before anything is written
            </span>
          </label>
        </div>
      </div>
      <div className="modal-foot">
        <span className="hint">The example sources are made up for this demo.</span>
        {err ? (
          <span className="err bad" role="alert">
            {err}
          </span>
        ) : null}
        <button type="button" className="btn btn-orange" onClick={submit} data-testid="assign-submit">
          Queue the task
        </button>
      </div>
    </Modal>
  );
}
