"use client";

import { useMemo, useState } from "react";
import { useLocalStore } from "@/components/wallet/useLocalStore";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import { CHAIN, explorerAddress, explorerTx } from "@/config/brand";
import { storageKey } from "@/config/storage";
import { explain, waitForReceipt } from "@/lib/client";

type Art = { creation: string; sha256: string };
type Progress = { ledger?: string; ledgerTx?: string; ledgerBlock?: number };

/** Owner tool: deploys AgenlyTaskLedger from the connected wallet. */
export function DeployPanel({ ledger }: { ledger: Art }) {
  const { address, onRobinhoodChain, sendTransaction, switchNetwork } = useWallet();
  const { open } = useWalletModal();
  const [p, setP] = useLocalStore<Progress>(storageKey("deploy", String(CHAIN.id)), {});
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const say = (s: string) => setLog((l) => [`${new Date().toLocaleTimeString()} ${s}`, ...l]);

  const snippet = useMemo(() => `const DEPLOYED = {\n  ledger: "${p.ledger ?? ""}",\n  ledgerBlock: ${p.ledgerBlock ?? 0},\n};`, [p]);

  async function deploy() {
    setBusy(true);
    try {
      const data = ledger.creation as `0x${string}`;
      say(`AgenlyTaskLedger: confirm in the wallet (${(data.length - 2) / 2} bytes)`);
      const hash = await sendTransaction({ data });
      say(`AgenlyTaskLedger: sent ${hash}`);
      const r = await waitForReceipt(hash, 300_000);
      if (!r.ok || !r.contractAddress) throw new Error("AgenlyTaskLedger deployment reverted");
      say(`AgenlyTaskLedger: deployed at ${r.contractAddress} (block ${r.blockNumber})`);
      setP({ ledger: r.contractAddress, ledgerTx: hash, ledgerBlock: r.blockNumber });
    } catch (e) {
      say(`failed: ${explain(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!address)
    return (
      <button type="button" className="btn btn-orange" onClick={open}>
        Connect the deployer wallet
      </button>
    );
  if (!onRobinhoodChain)
    return (
      <button type="button" className="btn btn-orange" onClick={switchNetwork}>
        Switch to {CHAIN.name}
      </button>
    );

  return (
    <div className="stack" data-testid="deploy-panel">
      <section className="paper">
        <h2 className="h3">1 · AgenlyTaskLedger (no arguments, no token)</h2>
        <p className="mono small muted">Build sha256 {ledger.sha256.slice(0, 16)}…</p>
        {p.ledger ? (
          <p>
            Deployed at{" "}
            <a href={explorerAddress(p.ledger)} target="_blank" rel="noreferrer" className="mono link" data-testid="deploy-address">
              {p.ledger}
            </a>{" "}
            (block {p.ledgerBlock},{" "}
            <a className="link" href={explorerTx(p.ledgerTx ?? "")} target="_blank" rel="noreferrer">
              tx
            </a>
            )
          </p>
        ) : (
          <button type="button" className="btn btn-orange" disabled={busy} data-testid="deploy-ledger" onClick={deploy}>
            {busy ? "Deploying…" : "Deploy AgenlyTaskLedger"}
          </button>
        )}
      </section>

      <section className="paper">
        <h2 className="h3">2 · Paste into src/config/contracts.ts</h2>
        <pre className="code" data-testid="deploy-snippet">
          {snippet}
        </pre>
        <p className="small muted">
          Then run <code>npm run verify-deployment -- --ledger {p.ledger ?? "0x…"} --ledger-tx {p.ledgerTx ?? "0x…"}</code>, verify the source on the explorer (referensi/explorer kit), and remove this page.
        </p>
      </section>

      {log.length ? (
        <ul className="loglist mono small" data-testid="deploy-log">
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
