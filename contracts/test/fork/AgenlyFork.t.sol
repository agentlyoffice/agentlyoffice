// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgenlyTaskLedger} from "../../src/AgenlyTaskLedger.sol";

/// Fork test against Robinhood Chain mainnet (chain id 4663):
///   forge test --match-path 'test/fork/*' --fork-url https://robinhood.drpc.org --evm-version cancun
/// The ledger integrates with no other contract; this checks it deploys and records on the real chain state
/// and that its block reading stays sane there.
contract AgenlyForkTest is Test {
    function setUp() public {
        vm.skip(block.chainid != 4663);
    }

    function test_fork_recordOnForkedChain() public {
        AgenlyTaskLedger led = new AgenlyTaskLedger();
        uint64 nowBlock = led.chainBlock();
        assertGt(nowBlock, 0);
        uint256 id = led.record(keccak256("task"), keccak256("result"), 3);
        assertEq(id, 1);
        assertEq(led.entry(id).chainBlock, nowBlock);
    }

    function test_fork_chainBlockIsTheChainsOwnBlock() public {
        AgenlyTaskLedger led = new AgenlyTaskLedger();
        // ArbSys is not emulated on a fork; the fallback is the forked block number, the chain's own block
        // (tens of millions), not the parent chain's block.
        assertEq(led.chainBlock(), uint64(block.number));
        assertGt(block.number, 90_000_000);
    }
}
