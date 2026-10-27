import type { Rect } from "@/lib/office/map";

/** The one-minute tour: nine stops, each framing part of the office. Our own words. */
export const TOUR: { title: string; text: string; rect: Rect | null; zoom?: number }[] = [
  {
    title: "Welcome to the Agently office",
    text: "Four agents work here, each at its own desk with its own tools. You bring the work and you make the last call. Here is the floor plan in nine short stops.",
    rect: null,
  },
  {
    title: "The Front desk",
    text: "Pim, the clerk, takes new tasks: a title, a brief, the sources to read and the kind of draft you want. Click the desk or the orange button to assign one.",
    rect: { x0: 5, y0: 14, x1: 10, y1: 21 },
  },
  {
    title: "The Research Lab",
    text: "Nova reads every source you pasted and keeps only the sentences that answer the brief, each with the id of the source it came from. Nothing is made up.",
    rect: { x0: 1, y0: 1, x1: 22, y1: 12 },
  },
  {
    title: "The Writers' Room",
    text: "Quill turns the research into a draft from a template: a summary note, an announcement, a status report or a post thread. Every line keeps its source tag.",
    rect: { x0: 38, y0: 23, x1: 56, y1: 38 },
  },
  {
    title: "The Review Office",
    text: "Mara runs the checklist: citations, words that are not in the source, promises, personal data, leftovers, length. Then the task waits for you to approve, edit or send it back.",
    rect: { x0: 36, y0: 1, x1: 56, y1: 12 },
  },
  {
    title: "The Stand-up Room",
    text: "The board on the wall shows every task as queued, running, review or completed. Call a stand-up and the whole team walks in to go over it.",
    rect: { x0: 1, y0: 23, x1: 18, y1: 38 },
  },
  {
    title: "Elevator and task notes",
    text: "The elevator panel holds the tool permissions of each agent. The corkboard next to it is the activity timeline: every hand-off, stop and decision.",
    rect: { x0: 1, y0: 14, x1: 21, y1: 16 },
  },
  {
    title: "The Ledger wall",
    text: "An approved task can be recorded on Robinhood Chain: the task hash, the result hash and your address. The texts stay with you; anyone with the file can check it.",
    rect: { x0: 32, y0: 14, x1: 40, y1: 16 },
  },
  {
    title: "Break Room and Restroom",
    text: "Agents with nothing to do rest in the break room. Walk around with WASD or the arrows, click an agent to see what it is doing, and press E to talk to the one next to you.",
    rect: { x0: 20, y0: 23, x1: 36, y1: 38 },
  },
];

export const ROOM_GUIDE: { name: string; color: string; text: string }[] = [
  { name: "Front desk", color: "#ffd84a", text: "In the hallway by the elevator. Assign a task: title, brief, sources, template." },
  { name: "Research Lab", color: "#4e9a91", text: "Nova picks the source sentences that answer the brief." },
  { name: "Writers' Room", color: "#9aa3b8", text: "Quill writes the draft from a template, with source tags." },
  { name: "Review Office", color: "#c66a3d", text: "Mara runs the checklist; you approve, edit or send back." },
  { name: "Stand-up Room", color: "#6f7fb4", text: "The task board. A stand-up brings everyone in." },
  { name: "Elevator and task notes", color: "#b6bfd0", text: "Tool permissions per agent, and the activity timeline." },
  { name: "Ledger wall", color: "#26244a", text: "Record an approval on Robinhood Chain, or check a task file." },
  { name: "Break Room", color: "#d08a45", text: "Ping pong, arcade, couch. Idle agents wait here." },
];
