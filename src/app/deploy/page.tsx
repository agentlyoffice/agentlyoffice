import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BRAND } from "@/config/brand";
import { GAS } from "@/config/contracts";
import { DeployPanel } from "@/components/deploy/DeployPanel";
import { PageShell } from "@/components/site/PageShell";
import ART from "@/lib/contracts/artifacts.json";

export const metadata: Metadata = {
  title: "Deploy contract",
  description: `Owner tool: deploy the ${BRAND.name} contract from your own wallet.`,
  robots: { index: false, follow: false },
};

// Owner tool, local only: on any public host this route is a 404.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export const dynamic = "force-dynamic";

export default async function DeployPage() {
  const host = (await headers()).get("host") ?? "";
  if (!LOCAL_HOST.test(host)) notFound();
  return (
    <PageShell>
      <p className="kicker">Owner tool · localhost only</p>
      <h1 className="h1">Deploy AgentlyTaskLedger</h1>
      <p className="lead">
        One transaction from your own wallet on Robinhood Chain, about {GAS.deploy.toLocaleString("en-US")} gas. No constructor arguments, no owner, no fee and no token needed, so the ledger can go live before {BRAND.symbol} launches. Progress is kept in this browser.
      </p>
      <DeployPanel ledger={{ creation: ART.contracts.AgentlyTaskLedger.creation, sha256: ART.contracts.AgentlyTaskLedger.sha256 }} />
    </PageShell>
  );
}
