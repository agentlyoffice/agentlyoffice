# Agenly — Assign tasks. Build workflows. Stay in control.

**One Office. Many Agents.** Agenly is a virtual agent office on Robinhood Chain: a pixel office where a researcher,
a writer and a reviewer agent pass your task desk to desk, every step is logged, each agent may only use the tools
you allow, and nothing is final until a person approves it. An approved result can be recorded on chain as two
fingerprints in `AgenlyTaskLedger`.

Website: https://agentlyoffice.lol

## The problem

Agent tools are quick to start and hard to trust. Work disappears into a chat window: you cannot see which agent did
what, what it was allowed to touch, where a sentence came from, or who signed off on the final text. Teams end up
re-checking everything by hand, or not checking at all.

## The solution

Agenly gives agent work a floor plan. Every task has a desk, a queue position, a source for every line and a human
decision at the end:

- **Virtual Agent Office** — walk a pixel office (WASD, click, zoom, minimap) and watch agents move between rooms.
- **Agent Desks** — Researcher (extractive picks from your sources), Writer (template drafts with source tags),
  Reviewer (a fixed checklist).
- **Task Board** — queued, running, review, completed, with hand-offs between agents.
- **Human Approval** — sensitive tasks stop after research; every task waits for you at the review desk; failing
  checklist items block approval until the draft is fixed.
- **Tool Permissions** — per-agent switches; a step needing a missing tool stops the task and says why.
- **Activity Timeline** — every hand-off, result, stop and decision, exportable.
- **Task ledger** — record the task hash, the result hash, the step count and your address on Robinhood Chain;
  anyone with the exported task file can check it on the ledger wall.

## How it works

1. Assign a task at the front desk: title, brief, up to six pasted sources, a template, optional live chain readings.
2. The researcher scores the source sentences against the brief and keeps up to six, each tagged `[S#]`. If nothing
   matches, the task stops and asks a person.
3. The writer arranges those picks into a summary note, an announcement, a status report or a post thread.
4. The reviewer checks citations, words not found in the cited source, promise words, personal data, placeholders,
   outside links and length.
5. You approve, edit (the checklist runs again) or send the task back. Approved tasks export as a JSON task file with
   two keccak-256 hashes, which you can record in `AgenlyTaskLedger`.

Optional AI: when the server has an OpenRouter key and you allow it per agent, the researcher and writer ask a model
that must answer only from your sources with `[S#]` tags; lines without a known source are dropped and the reviewer
still runs its rules. Without a key everything runs on the built-in methods and the site says so.

## What you can try

Live now: the office, the three desks, the task board, approvals, permissions, the timeline, live Robinhood Chain
readings, task file export and verification, wallet connect.

Coming later (planned, not live): the ledger contract once the owner deploys it (until then recording is a practice
signature in your browser), hosted agents that work while your tab is closed, external tools (search, email,
calendars) and $AGENLY utility (task credits, workspace capacity, premium office features).

## Run it locally

Requires Node 20+.

```sh
npm install
npm run build
npm start          # http://localhost:5750
npm test           # unit tests (desks, pipeline, permissions, map, relay, ledger calldata, verify-deployment logic)
npm run typecheck
```

Environment variables (all optional; set them in your shell or your host's dashboard, never commit them):

| Name | Purpose |
| --- | --- |
| `ROBINHOOD_RPC_URL` | Server-side Robinhood Chain RPC (default: public endpoints) |
| `NEXT_PUBLIC_ROBINHOOD_RPC_URL` | Browser Robinhood Chain RPC (default: public endpoints) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Enables WalletConnect (project id from cloud.reown.com) |
| `OPENROUTER_API_KEY` | Optional AI model for the researcher and writer desks (key starts with `sk-or-v1-`) |
| `OPENROUTER_MODEL` / `AI_HOURLY_LIMIT` | Model id override (a price ceiling still applies) / paid calls per hour |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Shared rate-limit store for the relay and the AI route |
| `TRUST_PROXY_HEADERS` | `1` behind a trusted proxy that sets client IP headers |

Without any of them the site works fully.

### Contracts

```sh
cd contracts && ./setup.sh                  # fetches forge-std into contracts/lib
forge test --no-match-path 'test/fork/*'    # unit, fuzz and invariant tests
forge test --match-path 'test/fork/*' --fork-url https://robinhood.drpc.org --evm-version cancun
forge build --force && cd .. && npm run contracts:artifacts -- --check
```

### Verify a deployment

```sh
npm run verify-deployment -- --ledger <address> --ledger-tx <creation tx>
```

It checks the chain id, that the runtime code equals this build, and that the creation input is exactly this build
(no constructor arguments).

## Network

Robinhood Chain mainnet, chain id 4663 (0x1237), native ETH, explorer https://robinhoodchain.blockscout.com. The site
adds the network to your wallet on connect.

## Project layout

```
src/app/                routes (/, /docs, /token; API: /api/chain, /api/rpc, /api/agent)
src/components/office/  the office: scene, desks, board, permissions, timeline, ledger wall, dialogs
src/lib/agency/         researcher, writer, reviewer, permissions, task pipeline, canonical JSON (tested)
src/lib/office/         floor plan, path finding, pixel font, character sprites, renderer, engine
src/lib/ledger.ts       reads and writes of AgenlyTaskLedger
src/config/             brand.ts (name, CA, launchpad), contracts.ts, assets.ts, ai.ts, wallets.ts
contracts/              AgenlyTaskLedger + tests (Foundry)
scripts/                artifact export and verify-deployment
```

## Contracts and token

- `AgenlyTaskLedger` — no constructor arguments; no owner, no admin, no fee, no payable function, no upgrade.
  `record(taskHash, resultHash, steps)`, one record per approver and pair. Address: not deployed yet.
- `$AGENLY` — launches on Pons (Robinhood Chain). Contract address: TBA (published on the token page first).

## Security and status

The contract is small and fully tested (unit, fuzz, invariant, Robinhood Chain fork, browser end-to-end on a local
chain). It holds no funds and stores hashes only; a record proves who recorded which fingerprints, not that the
content is true. Tasks live in your browser. Nothing here is financial advice.

## Contributing

Issues and pull requests are welcome. Download the ZIP or fork the repository, run the tests above, and keep the copy
honest: planned features stay labelled as planned.

## License

MIT, see `LICENSE`.
