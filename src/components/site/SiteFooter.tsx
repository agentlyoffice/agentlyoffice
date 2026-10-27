import Link from "next/link";
import { BRAND, CHAIN, LAUNCHPAD, buyUrl, explorerAddress, hasGithub } from "@/config/brand";
import { CONTRACTS, CONTRACT_NAMES, ledgerLive } from "@/config/contracts";
import { CaBlock } from "@/components/site/CopyCa";

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="foot-grid">
        <div>
          <p className="foot-brand">
            <span className="brand-mark" aria-hidden="true" /> {BRAND.name}
          </p>
          <p className="foot-note">
            {BRAND.tagline} An independent project on {BRAND.chainName}. The agents run in your browser; the ledger contract stores fingerprints, never your texts. {BRAND.symbol} is a utility token with no promise of value. Nothing here is financial advice.
          </p>
        </div>
        <nav aria-label="Product">
          <h2>Office</h2>
          <Link href="/">Enter the office</Link>
          <Link href="/?panel=assign">Assign a task</Link>
          <Link href="/?panel=board">Task board</Link>
          <Link href="/?panel=ledger">Ledger wall</Link>
        </nav>
        <nav aria-label="Learn">
          <h2>Learn</h2>
          <Link href="/docs">Docs</Link>
          <Link href="/docs#faq">FAQ</Link>
          <Link href="/token">{BRAND.symbol} token</Link>
          {ledgerLive() ? (
            <a href={explorerAddress(CONTRACTS.ledger)} target="_blank" rel="noreferrer">
              {CONTRACT_NAMES.ledger}
            </a>
          ) : (
            <Link href="/docs#contract">{CONTRACT_NAMES.ledger}</Link>
          )}
        </nav>
        <nav aria-label="Community">
          <h2>Community</h2>
          <a href={BRAND.x} target="_blank" rel="noreferrer">
            X {BRAND.xHandle}
          </a>
          {hasGithub ? (
            <a href={BRAND.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          ) : null}
          <a href={buyUrl()} target="_blank" rel="noreferrer">
            {LAUNCHPAD.name} launchpad
          </a>
          <a href={CHAIN.explorer} target="_blank" rel="noreferrer">
            {CHAIN.name} explorer
          </a>
        </nav>
      </div>
      <div className="foot-ca">
        <CaBlock label={`${BRAND.symbol} contract address`} />
      </div>
      <p className="foot-copy">
        © {new Date().getFullYear()} {BRAND.name} · {BRAND.domain}
      </p>
    </footer>
  );
}
