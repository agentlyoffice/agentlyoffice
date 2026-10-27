"use client";

import Link from "next/link";
import { ASSETS } from "@/config/assets";
import { BRAND } from "@/config/brand";
import { CaPill } from "@/components/site/CopyCa";
import { Face } from "@/components/office/Face";
import { useAgency, visitorLook } from "@/components/office/AgencyProvider";
import { NavWallet } from "@/components/wallet/WalletButton";

export type NavActions = {
  onTour: () => void;
  onHow: () => void;
  onBoard: () => void;
  onAssign: () => void;
  onStandup: () => void;
  onYou: () => void;
  standup: boolean;
  active: "office" | "board" | "tour" | "how" | null;
};

const XGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
  </svg>
);

/**
 * The navbar of every page. On the office page the buttons drive the scene (actions given); elsewhere they link
 * back to the office with the panel to open.
 */
export function SiteNav({ actions, current }: { actions?: NavActions; current?: "docs" | "token" }) {
  const { me } = useAgency();
  const link = (label: string, key: NavActions["active"], onClick: (() => void) | undefined, href: string) =>
    actions && onClick ? (
      <button type="button" className={actions.active === key ? "on" : ""} onClick={onClick} data-testid={`nav-${key}`}>
        {label}
      </button>
    ) : (
      <Link href={href}>{label}</Link>
    );
  return (
    <header className="nav">
      <Link href="/" className="brand" aria-label={`${BRAND.name} office`}>
        <img src={ASSETS.mark.src} width={ASSETS.mark.w} height={ASSETS.mark.h} alt="" aria-hidden="true" className="brand-mascot" />
        {actions ? (
          <h1 className="brand-name">
            <img src={ASSETS.wordmark.src} width={ASSETS.wordmark.w} height={ASSETS.wordmark.h} alt={BRAND.name} className="brand-word" />
          </h1>
        ) : (
          <span className="brand-name">
            <img src={ASSETS.wordmark.src} width={ASSETS.wordmark.w} height={ASSETS.wordmark.h} alt={BRAND.name} className="brand-word" />
          </span>
        )}
      </Link>
      <nav className="links" aria-label="Main">
        {actions ? (
          <button type="button" className={actions.active === "office" ? "on" : ""} onClick={() => undefined} data-testid="nav-office">
            Office
          </button>
        ) : (
          <Link href="/">Office</Link>
        )}
        {link("Tasks", "board", actions?.onBoard, "/?panel=board")}
        {link("Tour", "tour", actions?.onTour, "/?panel=tour")}
        {link("How it works", "how", actions?.onHow, "/?panel=how")}
        <Link href="/docs" className={current === "docs" ? "on" : ""}>
          Docs
        </Link>
        <Link href="/token" className={current === "token" ? "on" : ""}>
          Token
        </Link>
      </nav>
      <div className="nav-right">
        <span className="ca-wide">
          <CaPill />
        </span>
        <span className="ca-narrow">
          <CaPill compact />
        </span>
        {BRAND.x ? (
          <a className="x-link" href={BRAND.x} target="_blank" rel="noreferrer" aria-label={`${BRAND.name} on X`}>
            <XGlyph />
          </a>
        ) : null}
        {actions ? (
          <button type="button" className="btn btn-cream me-btn" onClick={actions.onYou} data-testid="nav-you" aria-label="Change your visitor look">
            <Face look={visitorLook(me)} className="me-face" />
            <span>{me?.name ?? "You"}</span>
          </button>
        ) : null}
        <span className="nav-wallet">
          <NavWallet className="btn btn-navy" label="Connect" />
        </span>
        {actions ? (
          <>
            <button type="button" className="btn btn-orange" onClick={actions.onAssign} data-testid="nav-assign">
              Assign a task
            </button>
            <button type="button" className="btn btn-red" onClick={actions.onStandup} disabled={actions.standup} data-testid="nav-standup">
              {actions.standup ? "Stand-up running" : "Call a stand-up"}
            </button>
          </>
        ) : (
          <Link href="/?panel=assign" className="btn btn-orange">
            Assign a task
          </Link>
        )}
      </div>
    </header>
  );
}
