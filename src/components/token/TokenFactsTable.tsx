"use client";

import { useChain } from "@/components/providers/ChainProvider";
import { BRAND, CHAIN, LAUNCHPAD, TOKEN, buyUrl, chartUrl, explorerToken } from "@/config/brand";

function supplyText(supply: string | null | undefined, decimals: number | null | undefined) {
  if (!supply || decimals === null || decimals === undefined) return null;
  return (BigInt(supply) / 10n ** BigInt(decimals)).toLocaleString("en-US");
}

/** Token facts read live from Robinhood Chain once the CA is set; dashes before that. */
export function TokenFactsTable() {
  const { facts } = useChain();
  const t = TOKEN.isLive ? facts?.token : null;
  const m = TOKEN.isLive ? facts?.market : null;
  const usd = (eth: number | undefined) => (eth !== undefined && facts?.ethUsd ? `$${(eth * facts.ethUsd).toLocaleString("en-US", { maximumFractionDigits: eth * facts.ethUsd < 1 ? 8 : 0 })}` : "—");
  const rows: [string, React.ReactNode][] = [
    ["Network", `${CHAIN.name} · id ${CHAIN.id}`],
    ["Status", TOKEN.isLive ? "Launched" : "Not launched yet"],
    ["Name / symbol on chain", t ? `${t.name ?? "—"} / ${t.symbol ?? "—"}` : "—"],
    ["Decimals", t?.decimals ?? "—"],
    ["Total supply", supplyText(t?.supply, t?.decimals) ?? "—"],
    ["Price", m ? usd(m.priceEth) : "—"],
    ["Market cap", m ? usd(m.marketCapEth) : "—"],
    ["Holders", TOKEN.isLive && facts?.holders !== null && facts?.holders !== undefined ? facts.holders.toLocaleString("en-US") : "—"],
    ["Curve progress", m ? (m.graduated ? "Graduated to a DEX pool" : `${(m.progressBps / 100).toFixed(1)}%`) : "—"],
    [
      "Launch venue",
      <a key="v" className="link" href={buyUrl()} target="_blank" rel="noreferrer">
        {LAUNCHPAD.name} <span className="arrow">↗</span>
      </a>,
    ],
  ];
  return (
    <div className="paper tablewrap">
      <table className="facts" data-testid="token-facts">
        <thead>
          <tr>
            <th colSpan={2}>
              {BRAND.symbol} · read from chain {TOKEN.isLive ? "" : "at launch"}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="k">{k}</td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row-btns">
        {TOKEN.isLive ? (
          <a className="btn btn-orange" href={buyUrl()} target="_blank" rel="noreferrer" data-testid="token-buy">
            Buy on {LAUNCHPAD.name} ↗
          </a>
        ) : (
          <a className="btn btn-cream" href={buyUrl()} target="_blank" rel="noreferrer" data-testid="token-buy">
            At launch on {LAUNCHPAD.name} ↗
          </a>
        )}
        {chartUrl(BRAND.ca) ? (
          <a className="btn btn-cream" href={chartUrl(BRAND.ca)!} target="_blank" rel="noreferrer">
            Chart on DEXTools ↗
          </a>
        ) : null}
        {TOKEN.isLive ? (
          <a className="btn btn-cream" href={explorerToken(BRAND.ca)} target="_blank" rel="noreferrer">
            Explorer ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
