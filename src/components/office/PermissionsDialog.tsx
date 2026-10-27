"use client";

import { AGENTS, useAgency } from "@/components/office/AgencyProvider";
import { Face } from "@/components/office/Face";
import { Modal } from "@/components/office/Modal";
import { OFFERED, TOOLS, toggle } from "@/lib/agency/permissions";
import { AGENT_LOOKS } from "@/lib/office/look";

/** Per-agent tool switches. New tasks take a copy; a stopped task can be retried with the new set. */
export function PermissionsDialog({ onClose }: { onClose: () => void }) {
  const { permissions, setPermissions, aiConfigured } = useAgency();
  return (
    <Modal title="Tool permissions" wide onClose={onClose} testid="permissions-dialog" sub="Each agent may use only the tools switched on here. A step that needs a tool its agent does not have stops the task and says why. New tasks keep a copy of these switches with them.">
      <div className="perm-grid">
        {AGENTS.map((a) => (
          <div key={a.id} className="perm">
            <div className="perm-head">
              <Face look={AGENT_LOOKS[a.id]} badge className="perm-face" />
              <div>
                <b>{a.name}</b>
                <span>{a.role}</span>
              </div>
            </div>
            {OFFERED[a.id].map((tool) => {
              const on = permissions[a.id].includes(tool);
              return (
                <label key={tool} className="check" title={TOOLS[tool].what}>
                  <input type="checkbox" checked={on} onChange={(e) => setPermissions(toggle(permissions, a.id, tool, e.target.checked))} data-testid={`perm-${a.id}-${tool}`} />
                  <span>
                    {TOOLS[tool].label}
                    {tool === "model.ai" ? <em>{aiConfigured ? " · model configured on this site" : " · no model configured on this site, so the built-in method runs"}</em> : null}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
      <p className="hint">The reviewer has no model switch on purpose: the checklist is the same rules every time. Approval is always yours.</p>
    </Modal>
  );
}
