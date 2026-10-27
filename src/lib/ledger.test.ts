import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeFunctionData } from "viem";
import { LEDGER_ABI } from "./abi";
import { practiceMessage, recordCalldata } from "./ledger";

test("record calldata round-trips through the ABI", () => {
  const t = `0x${"11".repeat(32)}` as const;
  const r = `0x${"22".repeat(32)}` as const;
  const data = recordCalldata(t, r, 3);
  assert.ok(data.startsWith("0x"));
  const d = decodeFunctionData({ abi: LEDGER_ABI, data });
  assert.equal(d.functionName, "record");
  assert.deepEqual(d.args, [t, r, 3]);
});

test("practice message carries both hashes", () => {
  const m = practiceMessage("Weekly note", "0xaa", "0xbb", 3);
  assert.match(m, /0xaa/);
  assert.match(m, /0xbb/);
  assert.match(m, /no transaction/);
});
