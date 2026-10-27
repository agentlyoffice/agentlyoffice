import { test } from "node:test";
import assert from "node:assert/strict";
import { USDG } from "@/config/brand";
import { checkBatch, runRelay } from "./relay";

const call = (to: string, data = "0x") => ({ method: "eth_call", params: [{ to, data }, "latest"] });

test("reads of known contracts are priced", () => {
  const out = checkBatch([call(USDG.address, "0x18160ddd")]);
  assert.ok("units" in out && out.units === 2);
});

test("unknown targets, signed transactions and every log query are refused", () => {
  assert.ok("error" in checkBatch([call("0x000000000000000000000000000000000000dead")]));
  assert.ok("error" in checkBatch([{ method: "eth_sendRawTransaction", params: ["0x02"] }]));
  assert.ok("error" in checkBatch([{ method: "eth_getLogs", params: [{ address: USDG.address, fromBlock: "0x1", toBlock: "latest" }] }]));
  assert.ok("error" in checkBatch([{ method: "eth_getLogs", params: [{ address: USDG.address, fromBlock: "0x1", toBlock: "0x2" }] }]));
  // ERC-20 metadata of an arbitrary address is not relayed either (the site never reads one).
  assert.ok("error" in checkBatch([call("0x000000000000000000000000000000000000dead", "0x06fdde03")]));
});

test("a refused budget never reaches the RPC", async () => {
  let reached = false;
  const out = await runRelay(call(USDG.address, "0x18160ddd"), {
    charge: async () => "slow down",
    one: async () => {
      reached = true;
      return { result: "0x" };
    },
    many: async () => [],
  });
  assert.equal(out.status, 429);
  assert.equal(reached, false);
});

test("an unknown address is charged, then refused without reaching the RPC", async () => {
  let charged = 0;
  let reached = false;
  const out = await runRelay(call("0x00000000000000000000000000000000000a11ce", "0x70a08231000000000000000000000000000000000000000000000000000000000000a11c"), {
    charge: async (u) => {
      charged += u;
      return null;
    },
    one: async () => {
      reached = true;
      return { result: "0x" };
    },
    many: async () => [],
  });
  assert.equal(out.status, 400);
  assert.ok(charged > 0);
  assert.equal(reached, false);
});

test("eth_estimateGas is relayed only for contracts the site reads", () => {
  const est = (tx: Record<string, unknown>) => ({ method: "eth_estimateGas", params: [tx] });
  const known = checkBatch([est({ to: USDG.address, data: "0x18160ddd" })]);
  assert.ok("units" in known && known.units === 3);
  assert.ok("error" in checkBatch([est({ to: "0x000000000000000000000000000000000000dead", data: "0x" })]));
  assert.ok("error" in checkBatch([est({ data: "0x6080" })]));
});

test("inherited object names are not methods", () => {
  for (const method of ["toString", "constructor", "__proto__", "hasOwnProperty", "valueOf"]) {
    assert.ok("error" in checkBatch([{ method, params: [] }]), method);
  }
});

test("no call reaches an address the site does not read, not even ERC-20 metadata", () => {
  const any = "0x1111111111111111111111111111111111111111";
  assert.ok("error" in checkBatch([{ method: "eth_call", params: [{ to: any, data: "0x95d89b41" }, "latest"] }]));
  assert.ok("error" in checkBatch([{ method: "eth_call", params: [{ to: any, input: "0x18160ddd" }, "latest"] }]));
  assert.ok("error" in checkBatch([{ method: "eth_call", params: [{ to: any, data: "0x70a08231" + "0".repeat(64) }, "latest"] }]));
  assert.ok("error" in checkBatch([{ method: "eth_call", params: [{ to: any, data: "0x95d89b4100" }, "latest"] }]));
  assert.ok("error" in checkBatch([{ method: "eth_call", params: [{ to: "nope", data: "0x95d89b41" }, "latest"] }]));
  assert.ok("units" in checkBatch([{ method: "eth_getTransactionByHash", params: ["0x" + "ab".repeat(32)] }]));
});
