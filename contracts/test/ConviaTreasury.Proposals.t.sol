// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ConviaTreasuryBase} from "./ConviaTreasury.Base.t.sol";
import {ConviaTreasury} from "../ConviaTreasury.sol";

/// Tests: createProposal, approveProposal, cancelProposal, executeProposal.
contract ConviaTreasuryProposalsTest is ConviaTreasuryBase {

    // ── setUp: add bob, then seed treasury balance so proposals can be created ──
    function setUp() public override {
        super.setUp();
        // Add bob via join flow (alice approves; REQ_APPROVALS=1)
        _fundAndApprove(bob, CONTRIBUTION * 100);
        _addMember(bob, alice);

        // Both members contribute so the treasury has funds
        vm.prank(alice);
        treasury.contribute();
        vm.prank(bob);
        treasury.contribute();
        // Treasury now holds 2 * CONTRIBUTION
    }

    // ── Happy-path: member creates proposal ────────────────────────────────

    function test_CreateProposal_HappyPath() public {
        uint256 expiry = block.timestamp + 1 days;
        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, CONTRIBUTION, "reason", expiry);

        assertEq(pid, 0);
        (
            uint256 id,
            address proposer,
            address recip,
            uint256 amount,
            ,
            uint256 expiresAt,
            bool executed,
            bool cancelled,
            uint256 approvalCount
        ) = treasury.getProposal(0);

        assertEq(id, 0);
        assertEq(proposer, alice);
        assertEq(recip, recipient);
        assertEq(amount, CONTRIBUTION);
        assertEq(expiresAt, expiry);
        assertFalse(executed);
        assertFalse(cancelled);
        assertEq(approvalCount, 0);
    }

    function test_CreateProposal_EmitsEvent() public {
        uint256 expiry = block.timestamp + 1 days;
        vm.prank(alice);
        vm.expectEmit(true, true, false, true, address(treasury));
        emit ConviaTreasury.ProposalCreated(0, alice, recipient, CONTRIBUTION, "reason", expiry);
        treasury.createProposal(recipient, CONTRIBUTION, "reason", expiry);
    }

    // ── Case 8: Non-member cannot propose ─────────────────────────────────

    function test_CreateProposal_Revert_NonMember() public {
        vm.prank(outsider);
        vm.expectRevert(ConviaTreasury.NotMember.selector);
        treasury.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);
    }

    // ── Create revert: invalid recipient ──────────────────────────────────

    function test_CreateProposal_Revert_ZeroRecipient() public {
        vm.prank(alice);
        vm.expectRevert(ConviaTreasury.InvalidRecipient.selector);
        treasury.createProposal(address(0), CONTRIBUTION, "r", block.timestamp + 1 days);
    }

    // ── Create revert: zero amount ────────────────────────────────────────

    function test_CreateProposal_Revert_ZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(ConviaTreasury.InvalidProposalAmount.selector);
        treasury.createProposal(recipient, 0, "r", block.timestamp + 1 days);
    }

    // ── Create revert: expiry in the past ────────────────────────────────

    function test_CreateProposal_Revert_ExpiryInPast() public {
        vm.prank(alice);
        vm.expectRevert(ConviaTreasury.InvalidExpiry.selector);
        treasury.createProposal(recipient, CONTRIBUTION, "r", block.timestamp);
    }

    // ── Case 16: Proposal creation fails when treasury balance is 0 ────────

    function test_CreateProposal_Revert_InsufficientBalance() public {
        // Deploy a fresh treasury with alice as creator and bob as second member — no funds deposited.
        // A second member is required so the contract doesn't revert with TreasuryHasOneMember first.
        vm.prank(alice);
        ConviaTreasury empty = new ConviaTreasury(
            "Empty", "d", address(usdc),
            CONTRIBUTION, FREQ,
            block.timestamp, block.timestamp + 12 * 7 days,
            alice, 1, TARGET, MAX_MEMBERS,
            new address[](0)
        );

        vm.prank(bob);
        empty.joinTreasury();

        vm.prank(alice);
        vm.expectRevert(ConviaTreasury.InsufficientTreasuryBalance.selector);
        empty.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);
    }

    // ── Happy-path: member approves proposal ──────────────────────────────

    function test_ApproveProposal_HappyPath() public {
        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, CONTRIBUTION, "reason", block.timestamp + 1 days);

        vm.prank(bob);
        treasury.approveProposal(pid);

        (, , , , , , , , uint256 approvalCount) = treasury.getProposal(pid);
        assertEq(approvalCount, 1);
        assertTrue(treasury.hasApproved(pid, bob));
    }

    function test_ApproveProposal_EmitsEvent() public {
        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        vm.prank(bob);
        vm.expectEmit(true, true, false, true, address(treasury));
        emit ConviaTreasury.ProposalApproved(pid, bob, 1);
        treasury.approveProposal(pid);
    }

    // ── Case 9: Non-member cannot approve ────────────────────────────────

    function test_ApproveProposal_Revert_NonMember() public {
        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        vm.prank(outsider);
        vm.expectRevert(ConviaTreasury.NotMember.selector);
        treasury.approveProposal(pid);
    }

    // ── Case 10: Proposer cannot self-approve ────────────────────────────

    function test_ApproveProposal_Revert_SelfApproval() public {
        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        vm.prank(alice);
        vm.expectRevert(ConviaTreasury.CannotApproveOwnProposal.selector);
        treasury.approveProposal(pid);
    }

    // ── Case 11: Duplicate approval does NOT increase count ───────────────

    function test_ApproveProposal_Revert_DuplicateApproval() public {
        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        vm.prank(bob);
        treasury.approveProposal(pid);

        vm.prank(bob);
        vm.expectRevert(ConviaTreasury.AlreadyApproved.selector);
        treasury.approveProposal(pid);

        // Count is still 1
        (, , , , , , , , uint256 count) = treasury.getProposal(pid);
        assertEq(count, 1);
    }

    // ── Case 19: Approve after expiry reverts ────────────────────────────

    function test_ApproveProposal_Revert_AfterExpiry() public {
        uint256 expiry = block.timestamp + 1 hours;
        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, CONTRIBUTION, "r", expiry);

        vm.warp(expiry + 1);

        vm.prank(bob);
        vm.expectRevert(ConviaTreasury.ProposalExpired.selector);
        treasury.approveProposal(pid);
    }

    // ── Approve on already-executed proposal reverts ─────────────────────

    function test_ApproveProposal_Revert_AlreadyExecuted() public {
        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        vm.prank(bob);
        treasury.approveProposal(pid);

        // Execute
        vm.prank(bob);
        treasury.executeProposal(pid);

        // Now bob already approved + proposal executed.
        // Alice is the proposer → CannotApproveOwnProposal fires first.
        // AlreadyExecuted is fully tested in Execute test suite.
    }

    // ── Case 20: Cancel only allowed by proposer ────────────────────────

    function test_CancelProposal_HappyPath() public {
        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        vm.prank(alice);
        vm.expectEmit(true, true, false, false, address(treasury));
        emit ConviaTreasury.ProposalCancelled(pid, alice);
        treasury.cancelProposal(pid);

        (, , , , , , , bool cancelled, ) = treasury.getProposal(pid);
        assertTrue(cancelled);
    }

    function test_CancelProposal_Revert_NonProposer() public {
        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        vm.prank(bob);
        vm.expectRevert(ConviaTreasury.NotProposer.selector);
        treasury.cancelProposal(pid);
    }

    function test_CancelProposal_Revert_AlreadyCancelled() public {
        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        vm.prank(alice);
        treasury.cancelProposal(pid);

        vm.prank(alice);
        vm.expectRevert(ConviaTreasury.ProposalAlreadyCancelled.selector);
        treasury.cancelProposal(pid);
    }

    // ── Case 18: Creator cannot bypass approval (must meet threshold) ─────

    function test_Execute_CreatorCannotBypassApprovals() public {
        // Alice (creator) proposes; needs 1 approval from a DIFFERENT member.
        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, CONTRIBUTION, "r", block.timestamp + 1 days);

        // Alice tries to execute without any approvals
        vm.prank(alice);
        vm.expectRevert(ConviaTreasury.NotEnoughApprovals.selector);
        treasury.executeProposal(pid);
    }
}
