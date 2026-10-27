"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AGENTS, agentName, useAgency, visitorLook } from "@/components/office/AgencyProvider";
import { AssignDialog } from "@/components/office/AssignDialog";
import { BoardDialog } from "@/components/office/BoardDialog";
import { Face } from "@/components/office/Face";
import { HowDialog } from "@/components/office/HowDialog";
import { LedgerDialog } from "@/components/office/LedgerDialog";
import { PermissionsDialog } from "@/components/office/PermissionsDialog";
import { TimelineDialog } from "@/components/office/TimelineDialog";
import { WhoDialog } from "@/components/office/WhoDialog";
import { SiteNav } from "@/components/site/SiteNav";
import { useChain } from "@/components/providers/ChainProvider";
import { TOUR } from "@/content/tour";
import { TOOLS } from "@/lib/agency/permissions";
import type { AgentId } from "@/lib/agency/types";
import { OfficeEngine } from "@/lib/office/engine";
import { AGENT_LOOKS } from "@/lib/office/look";
import { BREAK_SPOTS, MEETING_SPOTS, ROOMS, SEATS, type HotspotId, type RoomId } from "@/lib/office/map";

type Panel = "who" | "how" | "assign" | "board" | "permissions" | "timeline" | "ledger" | null;
type ChatLine = { id: number; who: string; text: string; sys?: boolean };

const WORK_BUBBLE: Record<string, string> = { researcher: "reading the sources", writer: "writing the draft", reviewer: "running the checklist" };

export function OfficeApp() {
  const agency = useAgency();
  const { facts, failed } = useChain();
  const { me, setMe, tasks, working, events, permissions } = agency;
  const canvas = useRef<HTMLCanvasElement>(null);
  const mini = useRef<HTMLCanvasElement>(null);
  const engine = useRef<OfficeEngine | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [boardInit, setBoardInit] = useState<{ task: string | null; focus?: "researcher" | "writer" | "reviewer" }>({ task: null });
  const [tour, setTour] = useState<number | null>(null);
  const [room, setRoom] = useState<RoomId>("hall");
  const [card, setCard] = useState<AgentId | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [standup, setStandup] = useState(false);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [line, setLine] = useState("");
  const chatInput = useRef<HTMLInputElement>(null);
  // false on the server and during hydration, true afterwards (the welcome dialog is server-rendered).
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  // First visit: the welcome dialog. Afterwards a ?panel= link may open a panel.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("panel");
    if (!q) return;
    const t = window.setTimeout(() => {
      if (q === "tour") setTour(0);
      else if (["how", "assign", "board", "ledger", "permissions", "timeline"].includes(q)) setPanel(q as Panel);
      window.history.replaceState(null, "", "/");
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  const needWho = mounted && !me;

  const say = useCallback((who: string, text: string, sys = false) => setChat((c) => [...c.slice(-5), { id: Date.now() + Math.random(), who, text, sys }]), []);

  const openBoard = useCallback((task: string | null = null, focus?: "researcher" | "writer" | "reviewer") => {
    setBoardInit({ task, focus });
    setPanel("board");
  }, []);

  const openDesk = useCallback(
    (agent: AgentId) => {
      if (agent === "clerk") return setPanel("assign");
      const stage = agent === "researcher" ? ["research", "gate"] : agent === "writer" ? ["write"] : ["check", "approval"];
      const t = tasks.find((x) => working[agent] === x.id) ?? tasks.find((x) => stage.includes(x.stage)) ?? tasks[0] ?? null;
      openBoard(t?.id ?? null, agent);
    },
    [tasks, working, openBoard],
  );

  const onHotspot = useCallback(
    (id: HotspotId) => {
      if (id === "frontdesk") setPanel("assign");
      else if (id === "board") openBoard();
      else if (id === "ledger") setPanel("ledger");
      else if (id === "notes") setPanel("timeline");
      else if (id === "elevator") setPanel("permissions");
      else openDesk(id);
    },
    [openBoard, openDesk],
  );
  const hotRef = useRef(onHotspot);
  useEffect(() => {
    hotRef.current = onHotspot;
  }, [onHotspot]);

  // Engine life cycle.
  useEffect(() => {
    if (!canvas.current) return;
    const e = new OfficeEngine(canvas.current, {
      onSelectActor: (id) => setCard(id as AgentId),
      onHotspot: (id) => hotRef.current(id),
      onRoom: (r) => setRoom(r),
    });
    for (const a of AGENTS) {
      const s = SEATS[a.id];
      e.addActor({ id: a.id, kind: "agent", name: a.name, look: AGENT_LOOKS[a.id], x: s.x, y: s.y, dir: s.dir, speed: 3.2 });
    }
    e.addActor({ id: "you", kind: "you", name: "You", look: visitorLook(null), x: SEATS.you.x, y: SEATS.you.y, dir: "down", speed: 4.5 });
    e.attachMinimap(mini.current);
    e.start();
    engine.current = e;
    return () => {
      e.destroy();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.setLook("you", visitorLook(me), me?.name ?? "You");
  }, [me]);

  useEffect(() => {
    engine.current?.attachMinimap(showMap ? mini.current : null);
  }, [showMap]);

  // Pause walking while a dialog is open.
  useEffect(() => {
    if (engine.current) engine.current.paused = panel !== null || needWho;
  }, [panel, needWho]);

  // Agents follow the pipeline: to the desk while working, a bubble saying what they do, a break otherwise.
  const standupRef = useRef(standup);
  useEffect(() => {
    standupRef.current = standup;
  }, [standup]);
  useEffect(() => {
    const e = engine.current;
    if (!e || standup) return;
    for (const a of ["researcher", "writer", "reviewer"] as const) {
      const busy = Boolean(working[a]);
      e.setBusy(a, busy);
      if (busy) {
        e.goTo(a, SEATS[a]);
        e.say(a, WORK_BUBBLE[a], 4500);
      }
    }
    const waiting = tasks.find((t) => t.stage === "approval" || t.stage === "gate");
    if (waiting) {
      e.goTo("reviewer", SEATS.reviewer);
      e.say("reviewer", "waiting for your OK", 6000);
    }
  }, [working, tasks, standup]);

  // Idle agents drift between their desk and the break room.
  useEffect(() => {
    const t = window.setInterval(() => {
      const e = engine.current;
      if (!e || standupRef.current) return;
      for (const a of ["researcher", "writer", "reviewer"] as const) {
        if (working[a] || !e.isIdle(a)) continue;
        if (a === "reviewer" && tasks.some((x) => x.stage === "approval" || x.stage === "gate")) continue;
        if (Math.random() < 0.35) {
          const goBreak = Math.random() < 0.6;
          e.goTo(a, goBreak ? BREAK_SPOTS[Math.floor(Math.random() * BREAK_SPOTS.length)] : SEATS[a]);
        }
      }
    }, 5000);
    return () => window.clearInterval(t);
  }, [working, tasks]);

  // The clerk greets new tasks.
  const lastQueued = useRef<string | null>(null);
  useEffect(() => {
    const q = tasks.find((t) => t.status === "queued");
    if (q && q.id !== lastQueued.current) {
      lastQueued.current = q.id;
      engine.current?.say("clerk", "got it, queued!", 3000);
    }
  }, [tasks]);

  // Tour: frame each stop.
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    if (tour === null) {
      e.frame(null);
      e.setZoom(e.defaultZoom());
      return;
    }
    const step = TOUR[tour];
    if (step.rect) {
      e.setZoom(Math.max(2, e.defaultZoom() - 1));
      e.frame(step.rect);
    } else {
      e.frame(null);
      e.setZoom(Math.max(1, e.defaultZoom() - 2));
    }
  }, [tour]);

  const startStandup = useCallback(() => {
    const e = engine.current;
    if (!e || standup) return;
    setStandup(true);
    e.alarm = true;
    AGENTS.forEach((a, i) => e.goTo(a.id, MEETING_SPOTS[i]));
    e.goTo("you", MEETING_SPOTS[4]);
    e.say("clerk", "stand-up, everyone!", 3000);
    say("Pim", "Stand-up in the Stand-up Room. The board opens when everyone is in.", true);
    window.setTimeout(() => {
      e.alarm = false;
      setStandup(false);
      openBoard();
      for (const a of AGENTS) e.goTo(a.id, SEATS[a.id]);
    }, 6500);
  }, [standup, say, openBoard]);

  // Keyboard: Enter focuses the chat, M toggles the map.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (panel || needWho) return;
      if (ev.key === "Enter") {
        ev.preventDefault();
        chatInput.current?.focus();
      } else if (ev.key.toLowerCase() === "m") setShowMap((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, needWho]);

  function sendChat() {
    const text = line.trim().slice(0, 140);
    setLine("");
    chatInput.current?.blur();
    if (!text) return;
    const name = me?.name ?? "You";
    say(name, text);
    engine.current?.say("you", text, 4000);
    const lower = text.toLowerCase();
    const counts = (s: string) => tasks.filter((t) => t.status === s).length;
    window.setTimeout(() => {
      if (/^(help|\?)$/.test(lower)) say("Pim", "Walk with WASD, click a desk to open it, E talks to the agent next to you. Type status, or task followed by a title.", true);
      else if (lower === "status") say("Pim", `Queued ${counts("queued")}, running ${counts("running")}, review ${counts("review")}, completed ${counts("completed")}.`, true);
      else if (lower.startsWith("task ")) {
        say("Pim", "Opening the front desk for that.", true);
        setPanel("assign");
      } else say("Pim", "Messages stay in this browser; nobody else sees them. Try help, status, or task <title>.", true);
    }, 400);
  }

  const roomInfo = ROOMS.find((r) => r.id === room) ?? ROOMS[3];
  const cardAgent = card ? AGENTS.find((a) => a.id === card) : null;
  const cardTask = card ? (tasks.find((t) => working[card] === t.id) ?? null) : null;
  const cardEvents = useMemo(() => (card ? events.filter((e) => e.agent === card).slice(0, 4) : []), [events, card]);
  const waitingYou = tasks.filter((t) => t.stage === "approval" || t.stage === "gate").length;

  const actions = {
    onTour: () => {
      setPanel(null);
      setTour(0);
    },
    onHow: () => setPanel("how"),
    onBoard: () => openBoard(),
    onAssign: () => setPanel("assign"),
    onStandup: startStandup,
    onYou: () => setPanel("who"),
    standup,
    active: (tour !== null ? "tour" : panel === "how" ? "how" : panel === "board" ? "board" : "office") as "office" | "board" | "tour" | "how",
  };

  return (
    <div className={`office ${tour !== null ? "touring" : ""} ${standup ? "alarm" : ""}`}>
      <SiteNav actions={actions} />
      <main className="stage" id="main-content">
        <canvas ref={canvas} id="office" aria-label="The Agently office: a pixel floor plan with agents at their desks. Use the buttons above or the keyboard to move around." />

        <div className="hud-tl">
          <div className="room-pill" data-testid="room-pill">
            <i style={{ background: roomInfo.dot }} />
            <span>{roomInfo.name}</span>
          </div>
          <div className="legend">
            <span>
              <i className="lg-agent" />
              Agent
            </span>
            <span>
              <i className="lg-me" />
              You
            </span>
          </div>
          <button type="button" className="count" onClick={() => openBoard()} data-testid="hud-count">
            {AGENTS.length} agents · {tasks.filter((t) => t.status !== "completed").length} open task(s)
          </button>
          <a className="chain-pill" href="/docs#data" data-testid="live-stats" title="Read live from Robinhood Chain">
            <i className={failed ? "off" : ""} />
            {facts?.block ? (
              <>
                Block {facts.block.toLocaleString("en-US")} · {facts.gasGwei !== null ? `${facts.gasGwei < 0.01 ? facts.gasGwei.toFixed(4) : facts.gasGwei.toFixed(3)} gwei` : "— gwei"} · ETH {facts.ethUsd ? `$${facts.ethUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
              </>
            ) : failed ? (
              "Chain unreachable"
            ) : (
              "Reading Robinhood Chain…"
            )}
          </a>
          <button type="button" className="hud-help" onClick={() => setPanel("how")} data-testid="hud-help">
            Help and docs
          </button>
          <button type="button" className="preview-pill" onClick={() => setPanel("permissions")} title="The agents run in this browser. Switch their tools at the elevator." data-testid="hud-local">
            Local agents
          </button>
        </div>

        {waitingYou ? (
          <button type="button" className="hint-hire" onClick={() => openDesk("reviewer")} data-testid="hud-waiting">
            {waitingYou} task(s) waiting for your decision at the review desk
          </button>
        ) : null}

        {cardAgent ? (
          <aside className="card" data-testid="agent-card">
            <button type="button" className="x" aria-label="Close" onClick={() => setCard(null)}>
              ×
            </button>
            <div className="card-top">
              <Face look={AGENT_LOOKS[cardAgent.id]} badge className="card-face" />
              <div>
                <div className="card-name">{cardAgent.name}</div>
                <div className="card-role">{cardAgent.role}</div>
              </div>
            </div>
            <dl className="card-rows">
              <div>
                <dt>Desk</dt>
                <dd>{cardAgent.desk}</dd>
              </div>
              <div>
                <dt>Now</dt>
                <dd>{cardTask ? `${WORK_BUBBLE[cardAgent.id] ?? "working"}: ${cardTask.title}` : cardAgent.id === "clerk" ? "at the front desk" : "idle"}</dd>
              </div>
              <div>
                <dt>Tools</dt>
                <dd>{permissions[cardAgent.id].map((t) => TOOLS[t].label).join(", ") || "none"}</dd>
              </div>
            </dl>
            {cardEvents.length ? (
              <ul className="card-log">
                {cardEvents.map((e) => (
                  <li key={e.id}>{e.text}</li>
                ))}
              </ul>
            ) : null}
            <div className="card-links">
              <button type="button" className="btn sm btn-orange" onClick={() => openDesk(cardAgent.id)} data-testid="card-open-desk">
                {cardAgent.id === "clerk" ? "Assign a task" : "Open the desk"}
              </button>
              <button type="button" className="btn sm btn-cream" onClick={() => setPanel("permissions")}>
                Permissions
              </button>
            </div>
          </aside>
        ) : null}

        <form
          className="chat"
          onSubmit={(e) => {
            e.preventDefault();
            sendChat();
          }}
        >
          <ul aria-live="polite">
            {chat.map((c, i) => (
              <li key={c.id} className={`${c.sys ? "sys" : ""} ${i < chat.length - 3 ? "old" : ""}`}>
                <b>{c.who}:</b> {c.text}
              </li>
            ))}
          </ul>
          <input ref={chatInput} value={line} onChange={(e) => setLine(e.target.value)} placeholder="Say something (Enter)" aria-label="Chat with the office" maxLength={140} data-testid="chat-input" />
        </form>

        <div className="minimap" hidden={!showMap}>
          <canvas ref={mini} id="mini" aria-label="Map of the office" />
        </div>

        {tour !== null ? (
          <div className="tour" data-testid="tour">
            <div className="tour-top">
              <span className="tour-step">
                {tour + 1} / {TOUR.length}
              </span>
              <button type="button" className="tour-skip" onClick={() => setTour(null)}>
                Skip the tour
              </button>
            </div>
            <h3>{TOUR[tour].title}</h3>
            <p>{TOUR[tour].text}</p>
            <div className="tour-foot">
              <button type="button" className="btn btn-cream" disabled={tour === 0} onClick={() => setTour((t) => Math.max(0, (t ?? 0) - 1))}>
                Back
              </button>
              <span className="tour-dots" aria-hidden="true">
                {TOUR.map((_, i) => (
                  <i key={i} className={i === tour ? "on" : ""} />
                ))}
              </span>
              <button type="button" className="btn btn-orange" onClick={() => setTour((t) => (t !== null && t < TOUR.length - 1 ? t + 1 : null))} data-testid="tour-next">
                {tour === TOUR.length - 1 ? "Start working" : "Next"}
              </button>
            </div>
          </div>
        ) : null}

        {!mounted || needWho ? (
          <WhoDialog
            me={null}
            first
            onClose={() => undefined}
            onSave={(m) => {
              setMe(m);
              say("Pim", `Welcome, ${m.name}. The front desk takes your first task.`, true);
              setTour(0);
            }}
          />
        ) : null}
        {panel === "who" ? (
          <WhoDialog
            me={me}
            first={false}
            onClose={() => setPanel(null)}
            onSave={(m) => {
              setMe(m);
              setPanel(null);
            }}
          />
        ) : null}
        {panel === "how" ? (
          <HowDialog
            onClose={() => setPanel(null)}
            onTour={() => {
              setPanel(null);
              setTour(0);
            }}
          />
        ) : null}
        {panel === "assign" ? (
          <AssignDialog
            onClose={() => setPanel(null)}
            onQueued={(id) => {
              setPanel(null);
              say("Pim", "Task queued. Nova starts reading in a moment.", true);
              void id;
            }}
          />
        ) : null}
        {panel === "board" ? <BoardDialog key={`${boardInit.task}-${boardInit.focus}`} initial={boardInit.task} focus={boardInit.focus} onClose={() => setPanel(null)} onAssign={() => setPanel("assign")} /> : null}
        {panel === "permissions" ? <PermissionsDialog onClose={() => setPanel(null)} /> : null}
        {panel === "timeline" ? <TimelineDialog onClose={() => setPanel(null)} onOpenTask={(id) => openBoard(id)} /> : null}
        {panel === "ledger" ? <LedgerDialog onClose={() => setPanel(null)} /> : null}
      </main>
    </div>
  );
}

export { agentName };
