import { parseAbi } from "viem";

/*
 * ABIs the site needs. LEDGER_ABI mirrors contracts/src/AgentlyTaskLedger.sol (src/lib/abi.test.ts checks it
 * against the compiled artifact so the two cannot drift apart).
 */
export const ERC20_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function owner() view returns (address)",
  "function getOwner() view returns (address)",
]);

export const FEED_ABI = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
]);

/** Pons V2 launch token: points at its bonding curve. */
export const PONS_TOKEN_ABI = parseAbi(["function curve() view returns (address)"]);

/** Pons V2 bonding curve, read side only (price, graduation progress). */
export const PONS_CURVE_ABI = parseAbi([
  "function getReserves() view returns (uint256 quoteReserve, uint256 tokenReserve)",
  "function realQuoteReserve() view returns (uint256)",
  "function graduationThreshold() view returns (uint256)",
  "function graduated() view returns (bool)",
  "function isNativeQuote() view returns (bool)",
]);

export const LEDGER_ABI = parseAbi([
  "struct Entry { address approver; uint8 steps; uint64 chainBlock; uint64 recordedAt; bytes32 taskHash; bytes32 resultHash; }",
  "function record(bytes32 taskHash, bytes32 resultHash, uint8 steps) returns (uint256 id)",
  "function entry(uint256 id) view returns (Entry)",
  "function find(address approver, bytes32 taskHash, bytes32 resultHash) view returns (uint256)",
  "function tripleKey(address approver, bytes32 taskHash, bytes32 resultHash) pure returns (bytes32)",
  "function approverCount(address approver) view returns (uint256)",
  "function taskCount(bytes32 taskHash) view returns (uint256)",
  "function idsByApprover(address approver, uint256 offset, uint256 limit) view returns (uint256[])",
  "function idsByTask(bytes32 taskHash, uint256 offset, uint256 limit) view returns (uint256[])",
  "function recordCount() view returns (uint256)",
  "function chainBlock() view returns (uint64)",
  "function MAX_STEPS() view returns (uint8)",
  "function MAX_PAGE() view returns (uint256)",
  "event Recorded(uint256 indexed id, bytes32 indexed taskHash, address indexed approver, bytes32 resultHash, uint8 steps, uint64 chainBlock)",
  "error ZeroHash()",
  "error BadSteps(uint8 steps)",
  "error AlreadyRecorded(uint256 id)",
  "error UnknownRecord(uint256 id)",
]);

export const ALL_ERRORS = LEDGER_ABI.filter((x) => x.type === "error");

/** Plain words for each custom error, shown instead of a selector. */
export const ERROR_WORDS: Record<string, string> = {
  ZeroHash: "A task or result fingerprint is empty.",
  BadSteps: "The step count must be between 1 and 32.",
  AlreadyRecorded: "This wallet already recorded exactly this task and result.",
  UnknownRecord: "No record exists with that id.",
};
