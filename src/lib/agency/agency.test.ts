import { test } from "node:test";
import assert from "node:assert/strict";
import { canonical, hashDoc } from "./canonical";
import { DEFAULT_PERMISSIONS, sanitize, toggle } from "./permissions";
import { pointsFromModel, research } from "./researcher";
import { check } from "./reviewer";
import { approve, bundle, canApprove, checkBundle, doCheck, doResearch, doWrite, editDraft, newTask, passGate, retry, sendBack, validateInput, type TaskInput } from "./tasks";
import { sentences } from "./text";
import { write } from "./writer";

const SRC_A = `The night market opens on Fridays at six in the evening. Vendors must register their stall two days before.
Stall fees are paid at the front gate in cash. The market closes at midnight, and the last entry is at eleven.`;
const SRC_B = `- Parking is free after seven on market nights.
- The north gate is closed for repairs until the end of the month.
- Vendors should bring their own lighting because the square has few lamps.`;

const input = (over: Partial<TaskInput> = {}): TaskInput => ({
  title: "Night market opening hours",
  brief: "When does the night market open and close, and what must vendors do before a stall?",
  template: "summary",
  sensitive: false,
  chainFacts: false,
  sources: [
    { label: "Market rules", text: SRC_A },
    { label: "Notice board", text: SRC_B },
  ],
  ...over,
});

test("canonical JSON sorts keys and hashes the same document the same way", () => {
  assert.equal(canonical({ b: 1, a: [2, { d: true, c: null }] }), '{"a":[2,{"c":null,"d":true}],"b":1}');
  assert.equal(hashDoc({ x: 1, y: 2 }), hashDoc({ y: 2, x: 1 }));
  assert.notEqual(hashDoc({ x: 1 }), hashDoc({ x: 2 }));
  assert.throws(() => canonical({ n: Number.NaN }));
});

test("sentences split bullets and keep abbreviations together", () => {
  const s = sentences(SRC_B + "\nCall e.g. the desk. Done.");
  assert.ok(s.some((x) => x.startsWith("Parking is free")));
  assert.ok(s.some((x) => x.includes("e.g. the desk")));
});

test("researcher picks matching sentences and keeps their sources", () => {
  const r = research("Night market hours", "When does the market open and close?", [
    { id: "S1", label: "a", text: SRC_A },
    { id: "S2", label: "b", text: SRC_B },
  ]);
  assert.equal(r.needsHuman, null);
  assert.ok(r.points.length >= 2 && r.points.length <= 6);
  assert.ok(r.points.some((p) => p.text.includes("opens on Fridays") && p.source === "S1"));
  for (const p of r.points) assert.ok(SRC_A.includes(p.text) || SRC_B.includes(p.text.replace(/^- /, "")), p.text);
});

test("researcher asks for a person when nothing matches the brief", () => {
  const r = research("Quarterly tax filing", "deadline for corporate tax forms", [{ id: "S1", label: "a", text: SRC_A }]);
  assert.ok(r.needsHuman);
  const empty = research("x y z", "", [{ id: "S1", label: "a", text: "short" }]);
  assert.ok(empty.needsHuman?.includes("no readable sentences"));
});

test("model points without a known source id are dropped", () => {
  const pts = pointsFromModel("- Opens at six on Fridays [S1]\n- Something invented\n- Free parking after seven [S9]\n2. Lamps are few [S2]", new Set(["S1", "S2"]));
  assert.deepEqual(
    pts.map((p) => p.source),
    ["S1", "S2"],
  );
});

test("every template's draft passes the checklist citations rule", () => {
  const sources = [
    { id: "S1", label: "Market rules", text: SRC_A },
    { id: "S2", label: "Notice board", text: SRC_B },
  ];
  const r = research("Night market hours", "open close vendors stall", sources);
  for (const t of ["summary", "announcement", "report", "thread"] as const) {
    const d = write("Night market", "open close vendors stall", t, r, sources);
    const rev = check(d, sources);
    const cit = rev.items.find((i) => i.id === "citations")!;
    assert.equal(cit.status, "pass", `${t}: ${cit.detail}`);
    assert.notEqual(rev.verdict, "blocked", `${t}: ${JSON.stringify(rev.items)}`);
  }
});

test("checklist flags promises, placeholders, uncited lines, unknown ids, outside links and personal data", () => {
  const sources = [{ id: "S1", label: "a", text: SRC_A }];
  const base = { by: "template" as const, template: "summary" as const, title: "t", edited: false };
  const r1 = check({ ...base, body: "- The market is guaranteed to make profit [S1]" }, sources);
  assert.equal(r1.items.find((i) => i.id === "promises")!.status, "fail");
  assert.equal(r1.verdict, "blocked");
  assert.equal(check({ ...base, body: "- The market opens on Fridays at six TODO [S1]" }, sources).items.find((i) => i.id === "leftovers")!.status, "fail");
  assert.equal(check({ ...base, body: "This sentence has no source at all, which is not allowed." }, sources).items.find((i) => i.id === "citations")!.status, "fail");
  assert.equal(check({ ...base, body: "- The market opens on Fridays [S7]" }, sources).items.find((i) => i.id === "citations")!.status, "fail");
  assert.equal(check({ ...base, body: "- Elephants dance quietly in winter forests [S1]" }, sources).items.find((i) => i.id === "grounded")!.status, "warn");
  assert.equal(check({ ...base, body: "- The market opens on Fridays, see https://example.org [S1]" }, sources).items.find((i) => i.id === "links")!.status, "warn");
  assert.equal(check({ ...base, body: "- The market opens on Fridays, mail ann@example.org [S1]" }, sources).items.find((i) => i.id === "personal")!.status, "warn");
});

test("input rules", () => {
  assert.equal(validateInput(input()), null);
  assert.ok(validateInput(input({ title: "ab" })));
  assert.ok(validateInput(input({ sources: [] })));
  assert.equal(validateInput(input({ sources: [], chainFacts: true })), null);
  assert.ok(validateInput(input({ sources: [{ label: "x", text: "y".repeat(12_001) }] })));
});

test("full pipeline: research, write, check, approve, bundle", () => {
  let t = newTask(input(), DEFAULT_PERMISSIONS, 1000, "t1");
  assert.equal(t.status, "queued");
  t = doResearch(t, 1001);
  assert.equal(t.stage, "write");
  assert.equal(t.status, "running");
  t = doWrite(t, 1002);
  assert.equal(t.stage, "check");
  t = doCheck(t, 1003);
  assert.equal(t.status, "review");
  assert.ok(canApprove(t), JSON.stringify(t.review));
  t = approve(t, 1004, "Looks right", "0x00000000000000000000000000000000000a11ce");
  assert.equal(t.status, "completed");
  const b = bundle(t);
  assert.equal(b.steps, 3);
  const c = checkBundle(JSON.parse(JSON.stringify(b)));
  assert.ok(c.ok && c.claimsMatch && c.taskHash === b.taskHash && c.resultHash === b.resultHash);
  const tampered = JSON.parse(JSON.stringify(b));
  tampered.result.draft.body += " extra";
  const c2 = checkBundle(tampered);
  assert.ok(c2.ok && !c2.claimsMatch && c2.resultHash !== b.resultHash && c2.taskHash === b.taskHash);
  assert.equal(checkBundle({ format: "other" }).ok, false);
});

test("sensitive tasks stop for a person after research", () => {
  let t = newTask(input({ sensitive: true }), DEFAULT_PERMISSIONS, 1, "t2");
  t = doResearch(t, 2);
  assert.equal(t.stage, "gate");
  assert.equal(t.status, "review");
  assert.equal(doWrite(t, 3).stage, "gate");
  t = passGate(t, 3);
  assert.equal(t.stage, "write");
});

test("permissions stop a step and retry runs it with the new set", () => {
  const noRead = toggle(DEFAULT_PERMISSIONS, "researcher", "sources.read", false);
  let t = newTask(input(), noRead, 1, "t3");
  t = doResearch(t, 2);
  assert.match(t.blocked ?? "", /not allowed to read pasted sources/);
  assert.equal(t.stage, "research");
  assert.equal(t.steps.at(-1)?.ok, false);
  t = retry(t, DEFAULT_PERMISSIONS);
  t = doResearch(t, 3);
  assert.equal(t.blocked, null);
  const chainOff = toggle(DEFAULT_PERMISSIONS, "researcher", "chain.read", false);
  const c = doResearch(newTask(input({ chainFacts: true }), chainOff, 1, "t4"), 2, { facts: { block: 1, gasGwei: 0.01, ethUsd: 3000, at: 0 } });
  assert.match(c.blocked ?? "", /Robinhood Chain/);
  const m = doResearch(newTask(input(), DEFAULT_PERMISSIONS, 1, "t5"), 2, { model: [{ text: "x".repeat(20), source: "S1", score: 0 }] });
  assert.match(m.blocked ?? "", /AI model/);
  let w = doResearch(newTask(input(), toggle(DEFAULT_PERMISSIONS, "writer", "templates", false), 1, "t6"), 2);
  w = doWrite(w, 3);
  assert.match(w.blocked ?? "", /templates/);
});

test("chain facts become source S0 and can be cited", () => {
  let t = newTask(input({ chainFacts: true, brief: "latest block gas price ETH dollars" }), DEFAULT_PERMISSIONS, 1, "t7");
  t = doResearch(t, 2, { facts: { block: 95_000_000, gasGwei: 0.01, ethUsd: 3012.5, at: 0 } });
  assert.ok(t.research!.points.some((p) => p.source === "S0"));
  const missing = doResearch(newTask(input({ chainFacts: true }), DEFAULT_PERMISSIONS, 1, "t8"), 2, { facts: null });
  assert.match(missing.blocked ?? "", /could not be fetched/);
});

test("an edited draft is checked again; a failing draft cannot be approved", () => {
  let t = doCheck(doWrite(doResearch(newTask(input(), DEFAULT_PERMISSIONS, 1, "t9"), 2), 3), 4);
  t = editDraft(t, `${t.draft!.body}\n- This is risk-free income [S1]`, 5);
  assert.equal(t.review!.verdict, "blocked");
  assert.equal(canApprove(t), false);
  assert.equal(approve(t, 6, "", null).status, "review");
  t = sendBack(t, { brief: "opening hours only" }, 7);
  assert.equal(t.status, "queued");
  assert.equal(t.revision, 1);
  assert.equal(t.draft, null);
});

test("stored permissions are cleaned", () => {
  const p = sanitize({ researcher: ["chain.read", "templates", "nope"], hacker: ["x"] });
  assert.deepEqual(p.researcher, ["chain.read"]);
  assert.deepEqual(p.writer, DEFAULT_PERMISSIONS.writer);
  assert.equal(toggle(DEFAULT_PERMISSIONS, "clerk", "model.ai", true).clerk.includes("model.ai"), false);
});
