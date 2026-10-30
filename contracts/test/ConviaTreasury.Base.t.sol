// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ConviaTreasury} from "../ConviaTreasury.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

/// @dev Shared base: actors, mock USDC, and a helper to deploy a standard treasury.
abstract contract ConviaTreasuryBase is Test {
    // ── Actors ──────────────────────────────────────────────────────────────
    address internal creator  = makeAddr("creator");
    address internal alice    = makeAddr("alice");
    address internal bob      = makeAddr("bob");
    address internal carol    = makeAddr("carol");
    address internal outsider = makeAddr("outsider");
    address internal recipient = makeAddr("recipient");

    // ── Mock USDC ────────────────────────────────────────────────────────────
    MockERC20 internal usdc;

    // ── Standard treasury (creator = alice; maxMembers = 5) ─────────────────
    //    Bob is added via requestJoin/approveJoin in tests that need 2+ members.
    ConviaTreasury internal treasury;

    // ── Standard params ──────────────────────────────────────────────────────
    uint256 internal constant CONTRIBUTION  = 100e6;   // 100 USDC (6 dec)
    uint256 internal constant TARGET        = 10_000e6;
    uint8   internal constant FREQ          = 0;       // weekly
    uint8   internal constant REQ_APPROVALS = 1;
    uint8   internal constant MAX_MEMBERS   = 5;

    // WEEKLY period = 604800 s; use 12 periods so (END - START) % 604800 == 0
    // startTimestamp = block.timestamp so treasury is active immediately.
    uint256 internal START;
    uint256 internal END;

    // ── setUp ────────────────────────────────────────────────────────────────
    function setUp() public virtual {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);

        START = block.timestamp;
        END   = block.timestamp + 12 * 7 days; // 84 days = 12 * 604800 (exact multiple)

        // Alice is the sole creator/initial member.
        vm.prank(alice);
        treasury = new ConviaTreasury(
            "TestTreasury",
            "Test Description",
            address(usdc),
            CONTRIBUTION,
            FREQ,
            START,
            END,
            alice,           // _creator
            REQ_APPROVALS,
            TARGET,
            MAX_MEMBERS,     // _maxMembers
            new address[](0) // _extraMembers
        );

        // Fund alice so she can contribute
        _fundAndApprove(alice, CONTRIBUTION * 100);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// Mint USDC to `who` and approve the treasury for the full amount.
    function _fundAndApprove(address who, uint256 amount) internal {
        usdc.mint(who, amount);
        vm.prank(who);
        usdc.approve(address(treasury), amount);
    }

    /// Have `applicant` call joinTreasury() on the base treasury.
    /// The `approver` param is kept for call-site compatibility but is unused
    /// (joinTreasury is permissionless in the new flow).
    function _addMember(address applicant, address /* approver */) internal {
        vm.prank(applicant);
        treasury.joinTreasury();
    }

    /// Deploy a treasury with a single creator address and custom parameters.
    function _deployTreasury(
        address _creator,
        uint8   _requiredApprovals,
        uint256 _start,
        uint256 _end,
        uint8   _freq,
        uint8   _maxMembers
    ) internal returns (ConviaTreasury t) {
        t = new ConviaTreasury(
            "CustomTreasury",
            "desc",
            address(usdc),
            CONTRIBUTION,
            _freq,
            _start,
            _end,
            _creator,
            _requiredApprovals,
            TARGET,
            _maxMembers,
            new address[](0)
        );
    }

    /// Have `proposer` create a live proposal (balance must be seeded first).
    function _createProposal(
        address proposer,
        address _recipient,
        uint256 amount,
        uint256 expiresIn
    ) internal returns (uint256 proposalId) {
        vm.prank(proposer);
        proposalId = treasury.createProposal(
            _recipient,
            amount,
            "reason",
            block.timestamp + expiresIn
        );
    }
}
