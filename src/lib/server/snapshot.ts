import "server-only";
import { decodeFunctionResult, encodeFunctionData, type Abi } from "viem";
import { BRAND, CHAIN, ETH_USD_FEED, isAddress } from "@/config/brand";
import { CONTRACTS, ledgerLive } from "@/config/contracts";
import { ERC20_ABI, FEED_ABI, LEDGER_ABI, PONS_CURVE_ABI, PONS_TOKEN_ABI } from "@/lib/abi";
import { rpcBatch } from "@/lib/feeds/rpc";

/*
 * Live facts for the whole site, all read from Robinhood Chain: the latest block and gas, the block pace,
 * ETH / USD from Chainlink, the token once its address is published (plus its Pons bonding curve: price, market cap,
 * graduation progress) and the AgenlyTaskLedger once deployed. Holder count comes from the explorer, best effort.
 */

export type ChainSnapshot = {
  at: number;
  block: number | null;
  blockTime: number | null;
  blockPace: number | null;
  gasGwei: number | null;
  ethUsd: number | null;
  ethUsdAt: number | null;
  token: { name: string | null; symbol: string | null; supply: string | null; decimals: number | null } | null;
  ledger: { records: number | null } | null;
  /** Pons bonding curve of the token, quoted in ETH. Null before launch or when the curve cannot be read. */
  market: {
    priceEth: number;
    marketCapEth: number;
    /** ETH raised on the curve so far and the amount at which it graduates to a DEX pool. */
    raisedEth: number;
    thresholdEth: number;
    /** 0–10000. */
    progressBps: number;
    graduated: boolean;
  } | null;
  holders: number | null;
};

type Read = { to: string; abi: Abi; fn: string };
const call = (r: Read) => ({ method: "eth_call", params: [{ to: r.to, data: encodeFunctionData({ abi: r.abi, functionName: r.fn, args: [] } as never) }, "latest"] });
function decode<T>(r: Read, raw: unknown): T | null {
  if (typeof raw !== "string" || raw.length < 4) return null;
  try {
    return decodeFunctionResult({ abi: r.abi, functionName: r.fn, data: raw as `0x${string}` } as never) as T;
  } catch {
    return null;
  }
}

const WEI = 10n ** 18n;
const eth = (wei: bigint) => Number((wei * 1_000_000n) / WEI) / 1_000_000;

// The curve of a Pons launch never changes, so it is read once per server instance.
let curveOf: { token: string; curve: string } | null = null;

async function readCurveAddress(token: string): Promise<string | null> {
  if (curveOf?.token === token) return curveOf.curve;
  const r: Read = { to: token, abi: PONS_TOKEN_ABI as Abi, fn: "curve" };
  const [raw] = await rpcBatch<unknown>([call(r)]).catch(() => [null]);
  const curve = decode<string>(r, raw);
  if (!curve || !isAddress(curve) || /^0x0{40}$/i.test(curve)) return null;
  curveOf = { token, curve };
  return curve;
}

async function readMarket(token: string, supply: bigint | null): Promise<ChainSnapshot["market"]> {
  const curve = await readCurveAddress(token);
  if (!curve || !supply) return null;
  const reads: Read[] = ["getReserves", "realQuoteReserve", "graduationThreshold", "graduated", "isNativeQuote"].map((fn) => ({ to: curve, abi: PONS_CURVE_ABI as Abi, fn }));
  const raw = await rpcBatch<unknown>(reads.map(call)).catch(() => reads.map(() => null));
  const reserves = decode<readonly [bigint, bigint]>(reads[0], raw[0]);
  const real = decode<bigint>(reads[1], raw[1]);
  const threshold = decode<bigint>(reads[2], raw[2]);
  const graduated = decode<boolean>(reads[3], raw[3]);
  const native = decode<boolean>(reads[4], raw[4]);
  // Only ETH-quoted curves are priced here; another quote token would need its own USD feed.
  if (!reserves || real === null || threshold === null || graduated === null || native !== true || reserves[1] === 0n) return null;
  const [quote, tokens] = reserves;
  const priceWei = (quote * WEI) / tokens;
  const progress = graduated ? 10_000n : threshold === 0n ? 0n : (real * 10_000n) / threshold;
  return {
    priceEth: Number(priceWei) / 1e18,
    marketCapEth: eth((priceWei * supply) / WEI),
    raisedEth: eth(real),
    thresholdEth: eth(threshold),
    progressBps: Number(progress > 10_000n ? 10_000n : progress),
    graduated,
  };
}

// Holder count from the explorer's public API. Cached for five minutes, failures included, so a blocked or slow
// explorer costs one request per five minutes at most. Null means "unknown", never zero.
let holders: { at: number; value: number | null } | null = null;
const HOLDERS_TTL = 300_000;

async function readHolders(token: string): Promise<number | null> {
  if (holders && Date.now() - holders.at < HOLDERS_TTL) return holders.value;
  let value: number | null = null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`${CHAIN.explorer}/api/v2/tokens/${token}`, {
      headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (compatible; site token facts)" },
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (res.ok && (res.headers.get("content-type") ?? "").includes("json")) {
      const body = (await res.json()) as { holders_count?: string | number; holders?: string | number };
      const n = Number(body.holders_count ?? body.holders);
      value = Number.isFinite(n) && n >= 0 ? n : null;
    }
  } catch {
    value = null;
  } finally {
    clearTimeout(timer);
  }
  holders = { at: Date.now(), value };
  return value;
}

export async function readSnapshot(): Promise<ChainSnapshot> {
  const ca = isAddress(BRAND.ca) ? BRAND.ca : null;
  const reads: Read[] = [{ to: ETH_USD_FEED, abi: FEED_ABI as Abi, fn: "latestRoundData" }];
  if (ca) for (const fn of ["name", "symbol", "totalSupply", "decimals"]) reads.push({ to: ca, abi: ERC20_ABI as Abi, fn });
  if (ledgerLive()) reads.push({ to: CONTRACTS.ledger, abi: LEDGER_ABI as Abi, fn: "recordCount" });
  const head = [
    { method: "eth_getBlockByNumber", params: ["latest", false] },
    { method: "eth_gasPrice", params: [] },
  ];
  const [h, results] = await Promise.all([rpcBatch<unknown>(head).catch(() => [null, null]), rpcBatch<unknown>(reads.map(call)).catch(() => reads.map(() => null))]);
  const block = h[0] && typeof h[0] === "object" ? (h[0] as { number: string; timestamp: string }) : null;
  const gas = typeof h[1] === "string" ? h[1] : null;
  let pace: number | null = null;
  if (block) {
    const back = await rpcBatch<{ timestamp: string }>([{ method: "eth_getBlockByNumber", params: [`0x${(BigInt(block.number) - 3000n).toString(16)}`, false] }]).catch(() => [null]);
    if (back[0]) pace = (Number(BigInt(block.timestamp)) - Number(BigInt(back[0].timestamp))) / 3000;
  }
  let i = 0;
  const feed = decode<readonly [bigint, bigint, bigint, bigint, bigint]>(reads[i], results[i]);
  i++;
  let token: ChainSnapshot["token"] = null;
  if (ca) {
    const v = reads.slice(i, i + 4).map((r, k) => decode<string | bigint | number>(r, results[i + k]));
    i += 4;
    token = {
      name: typeof v[0] === "string" ? v[0] : null,
      symbol: typeof v[1] === "string" ? v[1] : null,
      supply: typeof v[2] === "bigint" ? v[2].toString() : null,
      decimals: v[3] === null ? null : Number(v[3]),
    };
  }
  const supply = token?.supply ? BigInt(token.supply) : null;
  const [market, holderCount] = ca ? await Promise.all([readMarket(ca, supply).catch(() => null), readHolders(ca).catch(() => null)]) : [null, null];
  let ledger: ChainSnapshot["ledger"] = null;
  if (ledgerLive()) {
    const n = decode<bigint>(reads[i], results[i]);
    ledger = { records: n === null ? null : Number(n) };
  }
  return {
    at: Date.now(),
    block: block ? Number(BigInt(block.number)) : null,
    blockTime: block ? Number(BigInt(block.timestamp)) : null,
    blockPace: pace,
    gasGwei: gas ? Number(BigInt(gas)) / 1e9 : null,
    ethUsd: feed && feed[1] > 0n ? Number(feed[1]) / 1e8 : null,
    ethUsdAt: feed ? Number(feed[3]) : null,
    token,
    ledger,
    market,
    holders: holderCount,
  };
}
