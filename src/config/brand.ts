// Single place to change project identity. Everything on the site reads from here.
// To publish the real contract address, replace the value of CA below. The navbar copy pill, the footer,
// the token page, the buy buttons and every explorer link derive from it. Anything that is not a 0x + 40 hex
// address is treated as "not launched yet".

/** Contract address of $AGENTLY. "TBA" until the owner publishes it (owner block 27 Oct 2026: not launched yet). */
const CA: string = "TBA";

/**
 * True once the domain points at this deployment. While false, the production *.vercel.app host is served
 * as is (kept out of search with noindex) instead of redirecting to a domain that does not serve the site.
 * 27 Oct 2026: agentlyoffice.lol registered that day and pointed at the Vercel deployment (live).
 */
export const DOMAIN_LIVE = true;

export const isAddress = (v: string): v is `0x${string}` => /^0x[0-9a-fA-F]{40}$/.test(v);

const NAME = "Agently";
const SLUG = "agently";
/** Shown upper case everywhere; the owner corrected it to $AGENTLY on 27 Oct. */
const TICKER = "AGENTLY";
/** The owner's domain. The name is "Agently"; the domain keeps the owner's spelling. */
const DOMAIN = "agentlyoffice.lol";
/** X account confirmed by the owner (27 Oct 2026). */
const X_HANDLE = "agentlyoffice";

export const BRAND = {
  name: NAME,
  /** Lowercase id for package names and the like. Never used for stored keys (those are neutral). */
  slug: SLUG,
  ticker: TICKER,
  symbol: `$${TICKER}`,
  domain: DOMAIN,
  url: `https://${DOMAIN}`,
  slogan: "One Office. Many Agents.",
  tagline: "Assign tasks. Build workflows. Stay in control.",
  category: "virtual agent office",
  chainName: "Robinhood Chain",
  description: `${NAME} is a virtual agent office on Robinhood Chain. Researcher, Writer and Reviewer agents pass your task desk to desk, a person approves the result, and the approval can be recorded on chain.`,
  x: `https://x.com/${X_HANDLE}`,
  xHandle: `@${X_HANDLE}`,
  // Public source repository (owner, 27 Oct 2026).
  github: "https://github.com/agentlyoffice/agentlyoffice",
  ca: CA,
} as const;

/** True once BRAND.github points at an actual repository, not the bare host. */
export const hasGithub = /^https:\/\/github\.com\/[^/]+/.test(BRAND.github);

// Public endpoints are the default. An operator can point the site at a private RPC with ROBINHOOD_RPC_URL
// (server) / NEXT_PUBLIC_ROBINHOOD_RPC_URL (browser). Both are optional.
const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";

export const CHAIN = {
  id: 4663,
  hex: "0x1237",
  name: "Robinhood Chain",
  nativeSymbol: "ETH",
  decimals: 18,
  publicRpc: PUBLIC_RPC,
  rpc: process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL || PUBLIC_RPC,
  /** Second public endpoint, used for reads only when the first one fails. */
  fallbackRpc: "https://robinhood-rpc.publicnode.com",
  /** Third read endpoint for server code (some networks intercept the official host). */
  spareRpc: "https://robinhood.drpc.org",
  explorer: "https://robinhoodchain.blockscout.com",
} as const;

/** RPC for server code: the private endpoint when set, else the public one. */
export function serverRpc() {
  return process.env.ROBINHOOD_RPC_URL || process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL || PUBLIC_RPC;
}

export const TOKEN = {
  get isLive() {
    return isAddress(BRAND.ca);
  },
  get explorerUrl() {
    return isAddress(BRAND.ca) ? explorerToken(BRAND.ca) : null;
  },
};

export function explorerAddress(address: string) {
  return `${CHAIN.explorer}/address/${address}`;
}
export function explorerToken(address: string) {
  return `${CHAIN.explorer}/token/${address}`;
}
export function explorerTx(hash: string) {
  return `${CHAIN.explorer}/tx/${hash}`;
}
export function explorerBlock(n: number) {
  return `${CHAIN.explorer}/block/${n}`;
}
export function shortAddress(address: string, head = 6, tail = 4) {
  if (address.length <= head + tail + 2) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/** USDG ("Global Dollar") on Robinhood Chain. Read on-chain: symbol USDG, 6 decimals. */
export const USDG = {
  address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  symbol: "USDG",
  name: "Global Dollar",
  decimals: 6,
} as const;

export const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";

/** Chainlink ETH / USD on Robinhood Chain (verified on-chain). */
export const ETH_USD_FEED = "0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9";

/**
 * Chart links: DEXTools only (owner decision 23 Oct 2026). Robinhood Chain is listed on DEXTools under the chain slug
 * "robinhood"; the pair explorer accepts a token address and opens its main pool. Change the slug or pattern here only.
 */
export const DEXTOOLS_CHAIN = "robinhood";
export function chartUrl(address: string): string | null {
  return isAddress(address) ? `https://www.dextools.io/app/en/${DEXTOOLS_CHAIN}/pair-explorer/${address.toLowerCase()}` : null;
}

/**
 * Where $AGENTLY is bought: Pons (ponsfamily.com), the Robinhood Chain launchpad. Before the CA exists the buttons open
 * the launchpad home and read "At launch"; afterwards they open the token page /launchpad/<address>. Change it here only.
 */
export const LAUNCHPAD = {
  name: "Pons",
  home: "https://ponsfamily.com/launchpad",
  tokenUrl: (address: string) => `https://ponsfamily.com/launchpad/${address.toLowerCase()}`,
} as const;

/** Buy link: the launchpad token page once the CA is real, else the launchpad home. */
export function buyUrl(): string {
  return isAddress(BRAND.ca) ? LAUNCHPAD.tokenUrl(BRAND.ca) : LAUNCHPAD.home;
}
