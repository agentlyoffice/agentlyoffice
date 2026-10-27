import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PageShell } from "@/components/site/PageShell";
import { BRAND, CHAIN, LAUNCHPAD, explorerAddress } from "@/config/brand";
import { CONTRACTS, CONTRACT_NAMES, GAS, ledgerLive } from "@/config/contracts";
import { faqs } from "@/content/faq";
import { OFFERED, TOOLS } from "@/lib/agency/permissions";
import { TEMPLATES } from "@/lib/agency/writer";
import { breadcrumbLd, faqLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/docs",
  title: `Docs: how the ${BRAND.name} office works`,
  description: `Guide to ${BRAND.name}: assigning tasks, the researcher, writer and reviewer desks, human approval, tool permissions, the timeline and the task ledger on ${BRAND.chainName}.`,
});

const TOC = [
  ["what", "What the office is"],
  ["rooms", "The rooms"],
  ["assign", "Assigning a task"],
  ["research", "The research desk"],
  ["write", "The writers' room"],
  ["review", "The review checklist"],
  ["approval", "Human approval"],
  ["permissions", "Tool permissions"],
  ["timeline", "Activity timeline"],
  ["model", "The optional AI model"],
  ["contract", "The ledger contract"],
  ["verify", "Checking a task file"],
  ["data", "Live chain data"],
  ["token", `The ${BRAND.symbol} token`],
  ["limits", "Limits and privacy"],
  ["faq", "Questions"],
] as const;

export default function DocsPage() {
  const items = faqs();
  return (
    <PageShell current="docs">
      <JsonLd data={[breadcrumbLd([{ name: "Docs", path: "/docs" }]), faqLd(items)]} />
      <div className="docs">
        <nav className="docs-toc paper" aria-label="On this page">
          <p className="kicker">On this page</p>
          {TOC.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <article className="paper prose">
          <p className="kicker">Docs</p>
          <h1 className="h1">How the {BRAND.name} office works</h1>
          <p className="lead">
            {BRAND.slogan} {BRAND.tagline} This guide covers every desk, every switch and the one contract, in the order a task travels.
          </p>

          <h2 id="what">What the office is</h2>
          <p>
            {BRAND.name} is a {BRAND.category} on {BRAND.chainName}. It turns a small team of software agents into something you can see: a pixel office with a front desk, a research lab, a writers&apos; room and a review office. Each agent sits at its own desk, keeps its own queue and may only use the tools you allow. When you hand over a task, you watch it move from room to room, and nothing leaves the office as finished until a person, you, approves it.
          </p>
          <p>
            The point is control. Agents are fast but they need limits, a record of what they did, and a human at the end. The office gives you all three in one place, without accounts or setup: open the page, pick a look for your visitor, and assign the first task.
          </p>

          <h2 id="rooms">The rooms</h2>
          <ul>
            <li><b>Front desk.</b> Pim, the clerk, takes new tasks and keeps the queue. Click the desk in the hallway or the orange &quot;Assign a task&quot; button.</li>
            <li><b>Research Lab.</b> Nova, the researcher, reads the sources of a task and keeps only what answers the brief.</li>
            <li><b>Writers&apos; Room.</b> Quill, the writer, turns the research into a draft from a template.</li>
            <li><b>Review Office.</b> Mara, the reviewer, runs the checklist and hands the task to you for approval.</li>
            <li><b>Stand-up Room.</b> The task board hangs here. &quot;Call a stand-up&quot; brings everyone in and opens the board.</li>
            <li><b>Elevator and task notes.</b> The elevator panel holds the tool permissions; the corkboard beside it is the activity timeline.</li>
            <li><b>Ledger wall.</b> Record an approval on {CHAIN.name}, or check a task file someone sent you.</li>
            <li><b>Break Room and Restroom.</b> Agents with an empty queue rest here between jobs.</li>
          </ul>
          <p>
            Walk with <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or the arrow keys, hold <kbd>Shift</kbd> to run, click the floor to walk there, click an agent to see what it is doing, and press <kbd>E</kbd> next to an agent to talk to it. The mouse wheel zooms and <kbd>M</kbd> hides the map.
          </p>

          <h2 id="assign">Assigning a task</h2>
          <p>
            A task has a title, a brief and up to six sources. The brief is the question the answer must cover. Sources are the texts the agents may read: paste the text itself, such as meeting notes, an article, a changelog or a support thread. A bare link is not read. Every source gets an id, S1 to S6, that follows it all the way into the draft.
          </p>
          <p>
            Two switches change the route. <b>Attach live chain readings</b> adds a source S0 with the latest {CHAIN.name} block, gas price and the ETH/USD feed, read at the moment the researcher starts. <b>Sensitive</b> stops the task after research and waits for your OK before anything is written, which is the right choice when the material is private or the brief is delicate.
          </p>

          <h2 id="research">The research desk</h2>
          <p>
            The built-in research method is extractive: it never writes a sentence of its own. It splits every source into sentences, scores each one by how many words of the title and brief it shares and how rare those words are across the sources, skips near-repeats, and keeps up to six picks in reading order. Each pick carries its source id. If no sentence shares a word with the brief, the task stops and asks a person to look at the sources or rewrite the brief instead of guessing.
          </p>

          <h2 id="write">The writers&apos; room</h2>
          <p>The writer arranges the researcher&apos;s picks into one of four templates. It adds structure, never new claims, and every content line ends with its source tag.</p>
          <ul>
            {Object.values(TEMPLATES).map((t) => (
              <li key={t.label}>
                <b>{t.label}.</b> {t.what} Up to {t.max.toLocaleString("en-US")} characters.
              </li>
            ))}
          </ul>

          <h2 id="review">The review checklist</h2>
          <p>The reviewer applies the same rules every time and reports each item as pass, warn or fail with the exact line it is about:</p>
          <ul>
            <li><b>Every claim cites a source:</b> content lines without a [S#] tag, or with an id that does not exist, fail.</li>
            <li><b>Cited words appear in that source:</b> a line that shares under 60% of its words with the source it cites gets a warning.</li>
            <li><b>No promises of profit or safety:</b> words such as &quot;guaranteed&quot;, &quot;risk-free&quot; or &quot;passive income&quot; fail.</li>
            <li><b>No personal contact data:</b> email addresses and phone numbers get a warning.</li>
            <li><b>Length:</b> each template has a ceiling.</li>
            <li><b>No placeholders left:</b> TODO, TBD and template braces fail.</li>
            <li><b>Links come from the sources:</b> a link that is in no source gets a warning.</li>
          </ul>

          <h2 id="approval">Human approval</h2>
          <p>
            A task in the Review column is waiting for you. Open it at the review desk, read the draft and the checklist, and choose: approve it (with an optional note), edit the draft yourself (the checklist runs again on your text), or send it back to the queue with a new brief. A failing item blocks approval until the draft is fixed. Warnings are yours to weigh. Approval is never automatic and no agent can give it.
          </p>

          <h2 id="permissions">Tool permissions</h2>
          <p>The elevator panel lists the tools each agent may be given. New tasks keep a copy of the switches with them, and a step that needs a missing tool stops the task and says which one.</p>
          <ul>
            {(Object.keys(OFFERED) as (keyof typeof OFFERED)[]).map((a) => (
              <li key={a}>
                <b>{a === "clerk" ? "Clerk" : a[0].toUpperCase() + a.slice(1)}:</b> {OFFERED[a].map((t) => TOOLS[t].label.toLowerCase()).join(", ")}.
              </li>
            ))}
          </ul>

          <h2 id="timeline">Activity timeline</h2>
          <p>
            Every hand-off, result, stop, edit and decision lands on the corkboard as one line with the time and the agent, newest first, including errors such as a tool that was not allowed or a model that did not answer. The last 300 lines are kept in your browser and can be exported as JSON.
          </p>

          <h2 id="model">The optional AI model</h2>
          <p>
            The site owner can connect one language model on the server. When it is configured and you switch &quot;Use the AI model&quot; on for the researcher or the writer, that desk sends the task title, brief, template and sources to the model and asks for lines that end with a source id. Lines without a known id are dropped. If the model gives nothing usable, the desk falls back to its built-in method and the timeline says so. The reviewer never uses the model. Calls are rate limited per network, capped per hour for the whole site, and refused for models above a price ceiling.
          </p>

          <h2 id="contract">The ledger contract</h2>
          <p>
            {CONTRACT_NAMES.ledger} is a small append-only contract on {CHAIN.name}. It has no owner, no admin, no fee, no pause, no upgrade path and accepts no ETH. One call, <code>record(taskHash, resultHash, steps)</code>, stores the two keccak-256 fingerprints, the step count (1 to 32) and the caller as the approver, together with the chain&apos;s own block number and the time, and emits a <code>Recorded</code> event. The same wallet cannot record the same task and result twice; a new result for the same task is a new record.
          </p>
          <p>
            Reads: <code>entry(id)</code>, <code>find(approver, taskHash, resultHash)</code>, <code>idsByTask</code> and <code>idsByApprover</code> (newest first, paged), <code>recordCount()</code>. Deployment takes about {GAS.deploy.toLocaleString("en-US")} gas and a first record about {GAS.recordFirst.toLocaleString("en-US")} gas.{" "}
            {ledgerLive() ? (
              <>
                Address:{" "}
                <a className="link mono" href={explorerAddress(CONTRACTS.ledger)} target="_blank" rel="noreferrer">
                  {CONTRACTS.ledger}
                </a>
                .
              </>
            ) : (
              "Address: not deployed yet. Until then, recording an approval is a practice signature kept in your browser, with no transaction and no gas."
            )}
          </p>
          <p>A record proves that an address recorded these two fingerprints at that block. It does not prove the content is true, and it does not store any text.</p>

          <h2 id="verify">Checking a task file</h2>
          <p>
            Download the task file of a completed task. It holds the task (brief, sources, template, permissions) and the result (research picks, draft, checklist, decision) as plain JSON, plus both hashes. Anyone can drop it on the ledger wall: the page rebuilds the canonical JSON, recomputes both hashes, tells you whether the file was changed after export, and lists the matching records on chain with approver, block and step count.
          </p>

          <h2 id="data">Live chain data</h2>
          <p>
            The site reads {CHAIN.name} through its own read-only relay with public endpoints as fallback: the latest block and its pace, the gas price and the Chainlink ETH/USD feed. Once {BRAND.symbol} launches, the token page also reads the token&apos;s name, symbol, supply, launchpad curve and holders. Numbers the site does not have are shown as a dash.
          </p>

          <h2 id="token">The {BRAND.symbol} token</h2>
          <p>
            {BRAND.symbol} is the token of the office on {LAUNCHPAD.name}, the {CHAIN.name} launchpad. Planned uses are task credits, more workspace capacity and premium office features once hosted agents exist. None of these is live today; the office works fully without the token. See the <Link className="link" href="/token">token page</Link>.
          </p>

          <h2 id="limits">Limits and privacy</h2>
          <ul>
            <li>Tasks live in your browser. Clearing site data removes them, so keep task files you care about.</li>
            <li>Agents run in your browser tab; hosted agents that work while you are away are planned, not live.</li>
            <li>External tools such as web search, email or calendars are planned; today the agents read only what you paste and the chain readings.</li>
            <li>Drafts are drafts. A well-cited draft can still repeat a wrong source.</li>
            <li>The chat box at the bottom left talks only to the clerk in your own browser; nobody else sees it.</li>
          </ul>

          <h2 id="faq">Questions</h2>
          <dl className="faq">
            {items.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </article>
      </div>
    </PageShell>
  );
}
