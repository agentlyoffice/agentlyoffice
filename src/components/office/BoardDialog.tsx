"use client";

import { useState } from "react";
import { useAgency } from "@/components/office/AgencyProvider";
import { Modal } from "@/components/office/Modal";
import { TaskDetail } from "@/components/office/TaskDetail";
import type { Task, TaskStatus } from "@/lib/agency/types";

const COLS: { id: TaskStatus; label: string }[] = [
  { id: "queued", label: "Queued" },
  { id: "running", label: "Running" },
  { id: "review", label: "Review" },
  { id: "completed", label: "Completed" },
];

/** The task board on the stand-up room wall: four columns; a card opens the task. */
export function BoardDialog({ onClose, onAssign, initial, focus }: { onClose: () => void; onAssign: () => void; initial?: string | null; focus?: "researcher" | "writer" | "reviewer" }) {
  const { tasks } = useAgency();
  const [sel, setSel] = useState<string | null>(initial ?? null);
  const task = tasks.find((t) => t.id === sel) ?? null;
  const title = focus === "researcher" ? "Research Lab" : focus === "writer" ? "Writers' Room" : focus === "reviewer" ? "Review desk" : "Task board";
  return (
    <Modal title={task ? title : "Task board"} wide onClose={onClose} testid="board-dialog" sub={task ? undefined : "Every task moves left to right: queued at the front desk, running at a desk, review when a person has to decide, completed once you approve. Tasks live in this browser."}>
      {task ? (
        <>
          <button type="button" className="btn sm btn-cream back" onClick={() => setSel(null)} data-testid="board-back">
            ‹ All tasks
          </button>
          <TaskDetail key={task.id} task={task} focus={focus} />
        </>
      ) : (
        <>
          <div className="board" data-testid="board">
            {COLS.map((c) => {
              const list = tasks.filter((t) => t.status === c.id);
              return (
                <div key={c.id} className="col" data-testid={`col-${c.id}`}>
                  <h3>
                    {c.label} <span>{list.length}</span>
                  </h3>
                  {list.map((t) => (
                    <Card key={t.id} t={t} onOpen={() => setSel(t.id)} />
                  ))}
                  {!list.length ? <p className="empty">—</p> : null}
                </div>
              );
            })}
          </div>
          <div className="modal-foot">
            <span className="hint">{tasks.length ? `${tasks.length} task(s), newest first.` : "No tasks yet."}</span>
            <button type="button" className="btn btn-orange" onClick={onAssign}>
              Assign a task
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function Card({ t, onOpen }: { t: Task; onOpen: () => void }) {
  const flag = t.blocked ? "Stopped" : t.stage === "gate" ? "Needs your OK" : t.stage === "approval" ? "Needs approval" : t.record ? (t.record.mode === "chain" ? "On chain" : "Practice record") : null;
  return (
    <button type="button" className={`tcard ${t.blocked ? "bad" : ""}`} onClick={onOpen} data-testid="task-card">
      <b>{t.title}</b>
      <span>{t.stage === "done" ? "Approved" : t.stage}</span>
      {flag ? <i>{flag}</i> : null}
    </button>
  );
}
