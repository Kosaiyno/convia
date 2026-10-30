// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ConviaTreasuryBase} from "./ConviaTreasury.Base.t.sol";
import {ConviaTreasury} from "../ConviaTreasury.sol";

/// Tests: executeProposal — all happy paths and revert branches.
contract ConviaTreasuryExecuteTest is ConviaTreasuryBase {

    // Three-member treasury so we can have proposer + approver + executor as separate actors.
    ConviaTreasury internal t3;
    address internal proposer = makeAddr("proposer");
    address internal approver = makeAddr("approver");
    address internal executor = makeAddr("executor");

    function setUp() public override {
        super.setUp();

        // Deploy t3 with proposer as the sole creator (requiredApprovals=1, maxMembers=5).
        vm.prank(proposer);
        t3 = new ConviaTreasury(
            "T3", "d", address(usdc),
            CONTRIBUTION,
            FREQ,
            block.timestamp,
            block.timestamp + 12 * 7 days,
            proposer,   // _creator
            1,          // _requiredApprovals
            TARGET,
            5,          // _maxMembers
            new address[](0)
        );

        // Mint USDC and approve t3 for each actor.
        usdc.mint(proposer, CONTRIBUTION * 100);
        vm.prank(proposer);
        usdc.approve(address(t3), CONTRIBUTION * 100);

        usdc.mint(approver, CONTRIBUTION * 100);
        vm.prank(approver);
        usdc.approve(address(t3), CONTRIBUTION * 100);

        usdc.mint(executor, CONTRIBUTION * 100);
        vm.prank(executor);
        usdc.approve(address(t3), CONTRIBUTION * 100);

        // Add approver and executor via the permissionless joinTreasury().
        vm.prank(approver);
        t3.joinTreasury();

        vm.prank(executor);
        t3.joinTreasury();

        // All three contribute to seed treasury balance.
        vm.prank(proposer); t3.contribute();
        vm.prank(approver);  t3.contribute();
        vm.prank(executor);  t3.contribute();
    }

    // ── Case 17: Successful execution transfers USDC to recipient ─────────

    function test_Execute_TransfersUSDC() public {
        uint256 recipientBefore = usdc.balanceOf(recipient);
        uint256 treasuryBefore  = usdc.balanceOf(address(t3));

        vm.prank(proposer);
        uint256 pid = t3.createProposal(recipient, CONTRIBUTION, "pay out", block.timestamp + 1 days);

        vm.prank(approver);
        t3.approveProposal(pid);

        vm.prank(executor);
        vm.expectEmit(true, true, false, true, address(t3));
        emit ConviaTreasury.ProposalExecuted(pid, executor, recipient, CONTRIBUTION);
        t3.executeProposal(pid);

        assertEq(usdc.balanceOf(recipient), recipientBefore + CONTRIBUTION);
        assertEq(usdc.balanceOf(address(t3)), treasuryBefore - CONTRIBUTION);

        // Mark executed in storage
        (, , , , , , bool executed, , ) = t3.getProposal(pid);
        assertTrue(executed);
    }

    // ── Case 12: Cannot execute before threshold ──────────────────────────

    function test_Execute_Revert_NotEnoughApprovals() public {
        vm.prank(proposer);
        uint256 pid = t3.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        // No approvals yet
        vm.prank(executor);
        vm.expectRevert(ConviaTreasury.NotEnoughApprovals.selector);
        t3.executeProposal(pid);
    }

    // ── Case 13: Cannot execute twice ─────────────────────────────────────

    function test_Execute_Revert_AlreadyExecuted() public {
        vm.prank(proposer);
        uint256 pid = t3.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        vm.prank(approver);
        t3.approveProposal(pid);

        vm.prank(executor);
        t3.executeProposal(pid);

        vm.prank(executor);
        vm.expectRevert(ConviaTreasury.ProposalAlreadyExecuted.selector);
        t3.executeProposal(pid);
    }

    // ── Case 14: Cancelled proposals cannot execute ───────────────────────

    function test_Execute_Revert_Cancelled() public {
        vm.prank(proposer);
        uint256 pid = t3.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        vm.prank(approver);
        t3.approveProposal(pid);

        // Proposer cancels before execution
        vm.prank(proposer);
        t3.cancelProposal(pid);

        vm.prank(executor);
        vm.expectRevert(ConviaTreasury.ProposalAlreadyCancelled.selector);
        t3.executeProposal(pid);
    }

    // ── Case 15: Expired proposals cannot execute ─────────────────────────

    function test_Execute_Revert_Expired() public {
        uint256 expiry = block.timestamp + 1 hours;

        vm.prank(proposer);
        uint256 pid = t3.createProposal(recipient, CONTRIBUTION, "r", expiry);

        vm.prank(approver);
        t3.approveProposal(pid);

        // Warp past expiry
        vm.warp(expiry + 1);

        vm.prank(executor);
        vm.expectRevert(ConviaTreasury.ProposalExpired.selector);
        t3.executeProposal(pid);
    }

    // ── Case 16: Execution fails when treasury balance is insufficient ─────
    // (proposal amount > treasury balance at execute time)

    function test_Execute_Revert_InsufficientBalance() public {
        // Create proposal for entire treasury balance
        uint256 balance = usdc.balanceOf(address(t3));

        vm.prank(proposer);
        uint256 pid1 = t3.createProposal(recipient, balance, "drain all", block.timestamp + 1 days);

        vm.prank(proposer);
        uint256 pid2 = t3.createProposal(recipient, balance, "also drain", block.timestamp + 1 days);

        // Approve both
        vm.prank(approver);
        t3.approveProposal(pid1);
        vm.prank(approver);
        t3.approveProposal(pid2);

        // Execute first — drains treasury
        vm.prank(executor);
        t3.executeProposal(pid1);

        // Execute second — treasury now empty
        vm.prank(executor);
        vm.expectRevert(ConviaTreasury.InsufficientTreasuryBalance.selector);
        t3.executeProposal(pid2);
    }

    // ── Execute: non-member cannot call executeProposal ───────────────────

    function test_Execute_Revert_NonMember() public {
        vm.prank(proposer);
        uint256 pid = t3.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        vm.prank(approver);
        t3.approveProposal(pid);

        vm.prank(outsider);
        vm.expectRevert(ConviaTreasury.NotMember.selector);
        t3.executeProposal(pid);
    }

    // ── Approve on executed proposal reverts AlreadyExecuted ──────────────

    function test_ApproveAfterExecution_Reverts() public {
        vm.prank(proposer);
        uint256 pid = t3.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        vm.prank(approver);
        t3.approveProposal(pid);

        vm.prank(executor);
        t3.executeProposal(pid);

        // executor tries to approve the already-executed proposal
        vm.prank(executor);
        vm.expectRevert(ConviaTreasury.ProposalAlreadyExecuted.selector);
        t3.approveProposal(pid);
    }
}
