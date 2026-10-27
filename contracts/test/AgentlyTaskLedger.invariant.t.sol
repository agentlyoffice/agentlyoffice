// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentlyTaskLedger} from "../src/AgentlyTaskLedger.sol";

/// Drives random records from a few approvers over a few tasks/results and keeps its own model.
contract LedgerHandler is Test {
    AgentlyTaskLedger public led;
    address[3] public actors = [address(0x1001), address(0x1002), address(0x1003)];
    uint256 public written;
    mapping(bytes32 => uint256) public modelId;
    mapping(address => uint256) public perApprover;
    mapping(bytes32 => uint256) public perTask;

    constructor(AgentlyTaskLedger l) {
        led = l;
    }

    function record(uint256 a, uint256 t, uint256 r, uint8 steps) external {
        address who = actors[a % 3];
        bytes32 th = keccak256(abi.encode("t", t % 4));
        bytes32 rh = keccak256(abi.encode("r", r % 4));
        steps = uint8(bound(steps, 1, 32));
        bytes32 k = keccak256(abi.encode(who, th, rh));
        bool repeat = modelId[k] != 0;
        vm.prank(who);
        try led.record(th, rh, steps) returns (uint256 id) {
            assertFalse(repeat, "a repeated triple must revert");
            written++;
            assertEq(id, written);
            modelId[k] = id;
            perApprover[who]++;
            perTask[th]++;
        } catch {
            assertTrue(repeat, "only repeated triples may revert");
        }
    }
}

contract AgentlyTaskLedgerInvariant is Test {
    AgentlyTaskLedger led;
    LedgerHandler h;

    function setUp() public {
        led = new AgentlyTaskLedger();
        h = new LedgerHandler(led);
        targetContract(address(h));
    }

    function invariant_countsMatchModel() public view {
        assertEq(led.recordCount(), h.written());
        uint256 sumA;
        for (uint256 i = 0; i < 3; i++) {
            address who = h.actors(i);
            assertEq(led.approverCount(who), h.perApprover(who));
            sumA += led.approverCount(who);
        }
        assertEq(sumA, led.recordCount());
        uint256 sumT;
        for (uint256 t = 0; t < 4; t++) {
            bytes32 th = keccak256(abi.encode("t", t));
            assertEq(led.taskCount(th), h.perTask(th));
            sumT += led.taskCount(th);
        }
        assertEq(sumT, led.recordCount());
    }

    function invariant_findPointsBackToEntry() public view {
        for (uint256 a = 0; a < 3; a++) {
            address who = h.actors(a);
            for (uint256 t = 0; t < 4; t++) {
                for (uint256 r = 0; r < 4; r++) {
                    bytes32 th = keccak256(abi.encode("t", t));
                    bytes32 rh = keccak256(abi.encode("r", r));
                    uint256 id = led.find(who, th, rh);
                    assertEq(id, h.modelId(keccak256(abi.encode(who, th, rh))));
                    if (id != 0) {
                        AgentlyTaskLedger.Entry memory e = led.entry(id);
                        assertEq(e.approver, who);
                        assertEq(e.taskHash, th);
                        assertEq(e.resultHash, rh);
                    }
                }
            }
        }
    }
}
