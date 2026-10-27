import { keccak256, stringToBytes } from "viem";

/*
 * Canonical JSON: object keys sorted at every level, no whitespace, undefined dropped. The same document always
 * gives the same bytes, so its keccak-256 can be recomputed by anyone from an exported file.
 */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Numbers must be finite.");
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? "null" : canonical(v))).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(",")}}`;
}

export const hashDoc = (value: unknown): `0x${string}` => keccak256(stringToBytes(canonical(value)));
