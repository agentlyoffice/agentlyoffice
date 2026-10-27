"use client";

import Link from "next/link";
import { Modal } from "@/components/office/Modal";
import { ROOM_GUIDE } from "@/content/tour";

export function HowDialog({ onClose, onTour }: { onClose: () => void; onTour: () => void }) {
  return (
    <Modal title="How the office works" onClose={onClose} testid="how-dialog">
      <p className="sub">
        New here?{" "}
        <button type="button" className="btn sm btn-orange" onClick={onTour}>
          Take the one-minute tour
        </button>
      </p>
      <ul className="rooms-list">
        {ROOM_GUIDE.map((r) => (
          <li key={r.name}>
            <span className="sw" style={{ background: r.color }} />
            <span>
              <strong>{r.name}</strong> {r.text}
            </span>
          </li>
        ))}
      </ul>
      <p className="hint">Agents carry the office badge on their shirt and a navy label overhead; your label is yellow. Tasks, permissions and the timeline stay in this browser.</p>
      <p className="keys">
        <kbd>WASD</kbd> or arrows to walk, <kbd>Shift</kbd> to run, <kbd>E</kbd> to talk, <kbd>Enter</kbd> opens the chat box, a click walks you somewhere or opens a desk, the wheel zooms, <kbd>M</kbd> hides the map.
      </p>
      <p className="hint">
        The full guide is in the <Link className="link" href="/docs">docs</Link>; token facts are on the <Link className="link" href="/token">token page</Link>.
      </p>
    </Modal>
  );
}
