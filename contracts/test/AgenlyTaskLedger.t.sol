// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgenlyTaskLedger} from "../src/AgenlyTaskLedger.sol";

contract AgenlyTaskLedgerTest is Test {
    AgenlyTaskLedger led;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    bytes32 constant T1 = keccak256("task-1");
    bytes32 constant T2 = keccak256("task-2");
    bytes32 constant R1 = keccak256("result-1");
    bytes32 constant R2 = keccak256("result-2");

    event Recorded(uint256 indexed id, bytes32 indexed taskHash, address indexed approver, bytes32 resultHash, uint8 steps, uint64 chainBlock);

    function setUp() public {
        led = new AgenlyTaskLedger();
        vm.roll(1000);
        vm.warp(1_800_000_000);
    }

    function test_recordFirst() public {
        vm.expectEmit(true, true, true, true);
        emit Recorded(1, T1, alice, R1, 3, 1000);
        vm.prank(alice);
        uint256 id = led.record(T1, R1, 3);
        assertEq(id, 1);
        assertEq(led.recordCount(), 1);
        AgenlyTaskLedger.Entry memory e = led.entry(1);
        assertEq(e.approver, alice);
        assertEq(e.steps, 3);
        assertEq(e.chainBlock, 1000);
        assertEq(e.recordedAt, 1_800_000_000);
        assertEq(e.taskHash, T1);
        assertEq(e.resultHash, R1);
        assertEq(led.find(alice, T1, R1), 1);
        assertEq(led.approverCount(alice), 1);
        assertEq(led.taskCount(T1), 1);
    }

    function test_sameTripleRefused() public {
        vm.startPrank(alice);
        led.record(T1, R1, 3);
        vm.expectRevert(abi.encodeWithSelector(AgenlyTaskLedger.AlreadyRecorded.selector, 1));
        led.record(T1, R1, 2);
        vm.stopPrank();
    }

    function test_newResultForSameTaskIsNewRecord() public {
        vm.startPrank(alice);
        led.record(T1, R1, 3);
        uint256 id2 = led.record(T1, R2, 3);
        vm.stopPrank();
        assertEq(id2, 2);
        assertEq(led.taskCount(T1), 2);
        uint256[] memory ids = led.idsByTask(T1, 0, 10);
        assertEq(ids.length, 2);
        assertEq(ids[0], 2);
        assertEq(ids[1], 1);
    }

    function test_twoApproversSameTriple() public {
        vm.prank(alice);
        led.record(T1, R1, 3);
        vm.prank(bob);
        uint256 id = led.record(T1, R1, 3);
        assertEq(id, 2);
        assertEq(led.find(alice, T1, R1), 1);
        assertEq(led.find(bob, T1, R1), 2);
        assertEq(led.find(address(0xDEAD), T1, R1), 0);
    }

    function test_revertZeroHashes() public {
        vm.startPrank(alice);
        vm.expectRevert(AgenlyTaskLedger.ZeroHash.selector);
        led.record(bytes32(0), R1, 1);
        vm.expectRevert(AgenlyTaskLedger.ZeroHash.selector);
        led.record(T1, bytes32(0), 1);
        vm.stopPrank();
    }

    function test_revertBadSteps() public {
        vm.startPrank(alice);
        vm.expectRevert(abi.encodeWithSelector(AgenlyTaskLedger.BadSteps.selector, uint8(0)));
        led.record(T1, R1, 0);
        vm.expectRevert(abi.encodeWithSelector(AgenlyTaskLedger.BadSteps.selector, uint8(33)));
        led.record(T1, R1, 33);
        uint256 id = led.record(T1, R1, 32);
        vm.stopPrank();
        assertEq(id, 1);
    }

    function test_unknownReads() public {
        vm.expectRevert(abi.encodeWithSelector(AgenlyTaskLedger.UnknownRecord.selector, 0));
        led.entry(0);
        vm.expectRevert(abi.encodeWithSelector(AgenlyTaskLedger.UnknownRecord.selector, 1));
        led.entry(1);
        assertEq(led.idsByApprover(alice, 0, 10).length, 0);
        assertEq(led.idsByTask(T1, 0, 10).length, 0);
    }

    function test_approverPaging() public {
        vm.startPrank(alice);
        for (uint256 i = 1; i <= 5; i++) led.record(keccak256(abi.encode(i)), R1, 1);
        vm.stopPrank();
        uint256[] memory a = led.idsByApprover(alice, 0, 2);
        assertEq(a.length, 2);
        assertEq(a[0], 5);
        assertEq(a[1], 4);
        uint256[] memory b = led.idsByApprover(alice, 4, 10);
        assertEq(b.length, 1);
        assertEq(b[0], 1);
        assertEq(led.idsByApprover(alice, 5, 10).length, 0);
        assertEq(led.idsByApprover(alice, 0, 0).length, 0);
    }

    function test_pageCappedAtMax() public {
        vm.startPrank(alice);
        for (uint256 i = 1; i <= 105; i++) led.record(keccak256(abi.encode(i)), R1, 1);
        vm.stopPrank();
        assertEq(led.idsByApprover(alice, 0, 500).length, 100);
    }

    function test_noEthAccepted() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        (bool ok,) = address(led).call{value: 1}("");
        assertFalse(ok);
    }

    function test_chainBlockFallsBackWithoutArbSys() public view {
        assertEq(led.chainBlock(), 1000);
    }

    function test_chainBlockReadsArbSys() public {
        vm.etch(address(0x64), address(new FakeArbSys()).code);
        assertEq(led.chainBlock(), 98_765_432);
        vm.prank(alice);
        led.record(T1, R1, 2);
        assertEq(led.entry(1).chainBlock, 98_765_432);
    }

    function test_chainBlockSurvivesRevertingArbSys() public {
        vm.etch(address(0x64), hex"fe");
        assertEq(led.chainBlock(), 1000);
    }

    function testFuzz_recordRoundTrip(address who, bytes32 t, bytes32 r, uint8 steps) public {
        vm.assume(t != bytes32(0) && r != bytes32(0));
        steps = uint8(bound(steps, 1, 32));
        vm.prank(who);
        uint256 id = led.record(t, r, steps);
        AgenlyTaskLedger.Entry memory e = led.entry(id);
        assertEq(e.approver, who);
        assertEq(e.taskHash, t);
        assertEq(e.resultHash, r);
        assertEq(e.steps, steps);
        assertEq(led.find(who, t, r), id);
        vm.prank(who);
        vm.expectRevert(abi.encodeWithSelector(AgenlyTaskLedger.AlreadyRecorded.selector, id));
        led.record(t, r, steps);
    }

    function testFuzz_badStepsAlwaysRejected(uint8 steps) public {
        vm.assume(steps == 0 || steps > 32);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AgenlyTaskLedger.BadSteps.selector, steps));
        led.record(T1, R1, steps);
    }

    function test_gasDeployAndRecord() public {
        uint256 g0 = gasleft();
        new AgenlyTaskLedger();
        uint256 deployGas = g0 - gasleft();
        vm.prank(alice);
        g0 = gasleft();
        led.record(T1, R1, 3);
        uint256 recordGas = g0 - gasleft();
        emit log_named_uint("deploy gas (in-test)", deployGas);
        emit log_named_uint("record gas (in-test)", recordGas);
    }
}

contract FakeArbSys {
    fallback(bytes calldata) external returns (bytes memory) {
        return abi.encode(uint256(98_765_432));
    }
}
