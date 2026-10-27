"use client";

import { agentName, useAgency } from "@/components/office/AgencyProvider";
import { Modal } from "@/components/office/Modal";
import { downloadJson } from "@/components/office/RecordPanel";

/** The activity timeline: every hand-off, result, stop and decision, newest first (kept in this browser). */
export function TimelineDialog({ onClose, onOpenTask }: { onClose: () => void; onOpenTask: (id: string) => void }) {
  const { events, clearEvents, tasks } = useAgency();
  return (
    <Modal title="Activity timeline" wide onClose={onClose} testid="timeline-dialog" sub="What happened in the office, newest first. Errors are kept too. Stored in this browser only (last 300 entries).">
      <ol className="timeline" data-testid="timeline">
        {events.map((e) => (
          <li key={e.id} className={e.kind}>
            <span className="mono">{new Date(e.at).toLocaleTimeString()}</span>
            <b>{agentName(e.agent)}</b>
            <span>{e.text}</span>
            {e.taskId && tasks.some((t) => t.id === e.taskId) ? (
              <button type="button" className="linkbtn" onClick={() => onOpenTask(e.taskId!)}>
                open
              </button>
            ) : null}
          </li>
        ))}
        {!events.length ? <li>Nothing yet. Assign a task at the front desk.</li> : null}
      </ol>
      <div className="modal-foot">
        <button type="button" className="btn btn-cream" onClick={() => downloadJson("agently-timeline.json", events)} disabled={!events.length}>
          Export
        </button>
        <button type="button" className="btn btn-cream" onClick={clearEvents} disabled={!events.length}>
          Clear
        </button>
      </div>
    </Modal>
  );
}
