// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentlyTaskLedger
/// @notice Public, append-only ledger of approved agent tasks on Robinhood Chain.
///
/// When a person approves a task at the Agently review desk, their wallet can record two keccak-256 fingerprints:
/// the hash of the task (brief, sources, hand-off plan, tool permissions) and the hash of the approved result
/// (draft, review checklist, decision). The caller is the approver. Nothing is ever edited or removed.
///
/// What a record proves: this address approved a task with this fingerprint and a result with this fingerprint,
/// with this many agent steps, at this block. It does not store the task or the result, does not check what they
/// say, does not run agents and holds no funds. Anyone can hash an exported task file and compare.
///
/// @dev No owner, no admin, no fee, no pause, no upgrade path, no constructor arguments, nothing payable.
///      The same approver cannot record the same (task, result) pair twice; a new result for the same task is a
///      new record. On Arbitrum-style chains `block.number` is the parent chain's block, so the chain's own block
///      is read from the ArbSys precompile when it answers, and from `block.number` everywhere else (local tests).
contract AgentlyTaskLedger {
    struct Entry {
        address approver;
        uint8 steps;
        uint64 chainBlock;
        uint64 recordedAt;
        bytes32 taskHash;
        bytes32 resultHash;
    }

    /// @notice Most agent steps one record may claim.
    uint8 public constant MAX_STEPS = 32;
    /// @notice Most ids returned by one paged read.
    uint256 public constant MAX_PAGE = 100;

    address private constant ARB_SYS = address(0x64);
    bytes4 private constant ARB_BLOCK_NUMBER = 0xa3b1b31d;
    /// @dev Gas forwarded to ArbSys; the real precompile needs about a thousand. The cap keeps a chain where 0x64
    ///      holds failing code from burning the whole transaction's gas.
    uint256 private constant ARB_SYS_GAS = 30_000;

    /// @notice Number of records ever written. Record ids start at 1.
    uint256 public recordCount;

    mapping(uint256 id => Entry) private _entries;
    mapping(address approver => uint256[]) private _byApprover;
    mapping(bytes32 taskHash => uint256[]) private _byTask;
    /// @dev keccak256(approver, taskHash, resultHash) => record id.
    mapping(bytes32 tripleKey => uint256) private _triple;

    event Recorded(
        uint256 indexed id,
        bytes32 indexed taskHash,
        address indexed approver,
        bytes32 resultHash,
        uint8 steps,
        uint64 chainBlock
    );

    error ZeroHash();
    error BadSteps(uint8 steps);
    error AlreadyRecorded(uint256 id);
    error UnknownRecord(uint256 id);

    /// @notice Records that the caller approved `resultHash` for `taskHash` after `steps` agent steps.
    /// @param taskHash keccak-256 of the canonical task JSON.
    /// @param resultHash keccak-256 of the canonical result JSON.
    /// @param steps Agent steps in the hand-off chain, 1 to MAX_STEPS (self-reported, shown as such).
    /// @return id Record id.
    function record(bytes32 taskHash, bytes32 resultHash, uint8 steps) external returns (uint256 id) {
        if (taskHash == bytes32(0) || resultHash == bytes32(0)) revert ZeroHash();
        if (steps == 0 || steps > MAX_STEPS) revert BadSteps(steps);
        bytes32 t = tripleKey(msg.sender, taskHash, resultHash);
        uint256 prior = _triple[t];
        if (prior != 0) revert AlreadyRecorded(prior);

        uint64 nowBlock = chainBlock();
        id = ++recordCount;
        _triple[t] = id;
        _byApprover[msg.sender].push(id);
        _byTask[taskHash].push(id);
        _entries[id] = Entry({
            approver: msg.sender,
            steps: steps,
            chainBlock: nowBlock,
            recordedAt: uint64(block.timestamp),
            taskHash: taskHash,
            resultHash: resultHash
        });
        emit Recorded(id, taskHash, msg.sender, resultHash, steps, nowBlock);
    }

    // ---------------------------------------------------------------- reads

    /// @notice Record `id`. Reverts for an id that does not exist.
    function entry(uint256 id) external view returns (Entry memory) {
        if (id == 0 || id > recordCount) revert UnknownRecord(id);
        return _entries[id];
    }

    /// @notice Id of the record `approver` wrote for exactly this task and result, or 0.
    function find(address approver, bytes32 taskHash, bytes32 resultHash) external view returns (uint256) {
        return _triple[tripleKey(approver, taskHash, resultHash)];
    }

    /// @notice Key used for the one-record-per-(approver, task, result) rule.
    function tripleKey(address approver, bytes32 taskHash, bytes32 resultHash) public pure returns (bytes32) {
        return keccak256(abi.encode(approver, taskHash, resultHash));
    }

    /// @notice How many records `approver` wrote.
    function approverCount(address approver) external view returns (uint256) {
        return _byApprover[approver].length;
    }

    /// @notice How many records name `taskHash`.
    function taskCount(bytes32 taskHash) external view returns (uint256) {
        return _byTask[taskHash].length;
    }

    /// @notice Up to `limit` (max MAX_PAGE) record ids of `approver`, newest first, skipping `offset`.
    function idsByApprover(address approver, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        return _page(_byApprover[approver], offset, limit);
    }

    /// @notice Up to `limit` (max MAX_PAGE) record ids naming `taskHash`, newest first, skipping `offset`.
    function idsByTask(bytes32 taskHash, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        return _page(_byTask[taskHash], offset, limit);
    }

    /// @notice The chain's current block: ArbSys `arbBlockNumber()` when the precompile answers, else `block.number`.
    function chainBlock() public view returns (uint64) {
        (bool ok, bytes memory ret) = ARB_SYS.staticcall{gas: ARB_SYS_GAS}(abi.encodeWithSelector(ARB_BLOCK_NUMBER));
        if (ok && ret.length == 32) {
            uint256 n = abi.decode(ret, (uint256));
            if (n != 0 && n <= type(uint64).max) return uint64(n);
        }
        return uint64(block.number);
    }

    function _page(uint256[] storage all, uint256 offset, uint256 limit) private view returns (uint256[] memory ids) {
        uint256 n = all.length;
        if (limit > MAX_PAGE) limit = MAX_PAGE;
        if (offset >= n || limit == 0) return new uint256[](0);
        uint256 count = n - offset;
        if (count > limit) count = limit;
        ids = new uint256[](count);
        for (uint256 i = 0; i < count; i++) ids[i] = all[n - 1 - offset - i];
    }
}
