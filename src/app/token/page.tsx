import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { CaBlock } from "@/components/site/CopyCa";
import { PageShell } from "@/components/site/PageShell";
import { TokenFactsTable } from "@/components/token/TokenFactsTable";
import { ASSETS } from "@/config/assets";
import { BRAND, CHAIN, LAUNCHPAD, TOKEN } from "@/config/brand";
import { CONTRACT_NAMES } from "@/config/contracts";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/token",
  title: `${BRAND.name} (${BRAND.symbol}) Token`,
  description: `${BRAND.symbol} is the ${BRAND.name} token on ${BRAND.chainName}: contract address, supply and market read from chain, launch venue and its planned utility.`,
});

const PLANNED = [
  { t: "Task credits", d: "Paying for hosted agent runs once agents can work without your tab open." },
  { t: "Workspace capacity", d: "More desks, agents and stored tasks for teams on a hosted office." },
  { t: "Premium office features", d: "Shared boards, longer timelines and extra templates." },
];

export default function TokenPage() {
  const a = ASSETS.art.token;
  return (
    <PageShell current="token">
      <JsonLd data={breadcrumbLd([{ name: "Token", path: "/token" }])} />
      <div className="token-head paper">
        <div>
          <p className="kicker">
            {BRAND.name} token · {CHAIN.name}
          </p>
          <h1 className="h1">{BRAND.symbol}</h1>
          <p className="lead">
            The token of the {BRAND.name} office on {BRAND.chainName}. {TOKEN.isLive ? `It trades on ${LAUNCHPAD.name}.` : `It has not launched yet; it will launch on ${LAUNCHPAD.name}.`} Its uses belong to planned hosted features, so today it gives no access, discount or return, and the office works fully without it.
          </p>
        </div>
        <img src={a.src} width={a.w} height={a.h} alt={a.alt} className="pixel token-art" />
      </div>
      <div className="token-grid">
        <TokenFactsTable />
        <div className="stack">
          <div className="paper">
            <CaBlock label={`${BRAND.symbol} contract address`} />
          </div>
          <div className="paper">
            <p className="kicker">
              Utility <span className="tag warn">Planned</span>
            </p>
            {PLANNED.map((p) => (
              <div key={p.t} className="planned">
                <h2 className="h4">{p.t}</h2>
                <p>{p.d}</p>
              </div>
            ))}
            <p className="hint">Plans, not promises: none of these exist yet, and none promises a price, yield or reward.</p>
          </div>
          <p className="small">
            {CONTRACT_NAMES.ledger} does not need the token. See{" "}
            <Link className="link" href="/docs#contract">
              the contract docs
            </Link>
            .
          </p>
        </div>
      </div>
    </PageShell>
  );
}
