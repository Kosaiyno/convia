// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ConviaTreasuryBase} from "./ConviaTreasury.Base.t.sol";
import {ConviaTreasury} from "../ConviaTreasury.sol";

/// Tests: deployment, initialization, and constructor revert paths.
contract ConviaTreasuryDeployTest is ConviaTreasuryBase {

    // ── Case 1: Valid treasury deploys correctly ──────────────────────────────

    function test_Deployment_SetsConfigCorrectly() public view {
        assertEq(treasury.name(), "TestTreasury");
        assertEq(treasury.contributionAmount(), CONTRIBUTION);
        assertEq(treasury.frequency(), FREQ);
        assertEq(treasury.startTimestamp(), START);
        assertEq(treasury.endTimestamp(), END);
        assertEq(treasury.requiredApprovals(), REQ_APPROVALS);
        assertEq(treasury.targetAmount(), TARGET);
        assertEq(treasury.usdcToken(), address(usdc));
        assertEq(treasury.maxMembers(), MAX_MEMBERS);
    }

    // ── Only creator is a member at deployment ────────────────────────────

    function test_Deployment_OnlyCreatorIsMember() public view {
        assertEq(treasury.getMemberCount(), 1);
        assertTrue(treasury.isMember(alice));
        assertFalse(treasury.isMember(bob));
        assertFalse(treasury.isMember(outsider));
    }

    // ── getTreasuryInfo returns 11 values including maxMembers ────────────

    function test_Deployment_GetTreasuryInfo() public view {
        (
            string memory tName,
            string memory tDesc,
            address tUsdc,
            uint256 tContrib,
            uint8   tFreq,
            uint256 tStart,
            uint256 tEnd,
            uint8   tReqApprovals,
            uint256 tTarget,
            uint256 tMemberCount,
            uint8   tMaxMembers
        ) = treasury.getTreasuryInfo();

        assertEq(tName,         "TestTreasury");
        assertEq(tDesc,         "Test Description");
        assertEq(tUsdc,         address(usdc));
        assertEq(tContrib,      CONTRIBUTION);
        assertEq(tFreq,         FREQ);
        assertEq(tStart,        START);
        assertEq(tEnd,          END);
        assertEq(tReqApprovals, REQ_APPROVALS);
        assertEq(tTarget,       TARGET);
        assertEq(tMemberCount,  1);
        assertEq(tMaxMembers,   MAX_MEMBERS);
    }

    // ── TreasuryCreated event uses new signature ──────────────────────────

    function test_Deployment_EmitsTreasuryCreated() public {
        vm.expectEmit(false, false, false, true);
        emit ConviaTreasury.TreasuryCreated("T2", alice, MAX_MEMBERS, REQ_APPROVALS);

        vm.prank(alice);
        new ConviaTreasury(
            "T2",
            "desc",
            address(usdc),
            CONTRIBUTION,
            FREQ,
            block.timestamp,
            block.timestamp + 12 * 7 days,
            alice,
            REQ_APPROVALS,
            TARGET,
            MAX_MEMBERS,
            new address[](0)
        );
    }

    // ── MemberJoined emitted for creator ─────────────────────────────────

    function test_Deployment_EmitsMemberJoinedForCreator() public {
        vm.expectEmit(true, false, false, false);
        emit ConviaTreasury.MemberJoined(alice);

        vm.prank(alice);
        new ConviaTreasury(
            "T3", "d", address(usdc),
            CONTRIBUTION, FREQ,
            block.timestamp, block.timestamp + 12 * 7 days,
            alice, REQ_APPROVALS, TARGET, MAX_MEMBERS,
            new address[](0)
        );
    }

    // ── Case 3a: requiredApprovals = 0 rejected ──────────────────────────

    function test_Deploy_Revert_ZeroRequiredApprovals() public {
        vm.expectRevert(ConviaTreasury.InvalidRequiredApprovals.selector);
        _deployTreasury(alice, 0, block.timestamp, block.timestamp + 12 * 7 days, FREQ, MAX_MEMBERS);
    }

    // ── Case 3b: requiredApprovals > maxMembers-1 rejected ───────────────
    // maxMembers=5, requiredApprovals=5 → 5 > 5-1=4 → revert

    function test_Deploy_Revert_RequiredApprovalsExceedsMaxMembers() public {
        vm.expectRevert(ConviaTreasury.InvalidRequiredApprovals.selector);
        // maxMembers=3, requiredApprovals=3 → 3 > 3-1=2 → invalid
        _deployTreasury(alice, 3, block.timestamp, block.timestamp + 12 * 7 days, FREQ, 3);
    }

    // ── requiredApprovals == maxMembers-1 is valid (boundary) ────────────

    function test_Deploy_ValidRequiredApprovalsAtBoundary() public {
        // maxMembers=5, requiredApprovals=4 → 4 == 5-1=4 → valid
        ConviaTreasury t = _deployTreasury(alice, 4, block.timestamp, block.timestamp + 12 * 7 days, FREQ, 5);
        assertEq(t.requiredApprovals(), 4);
    }

    // ── InvalidMemberCount: maxMembers < 2 ───────────────────────────────

    function test_Deploy_Revert_MaxMembersTooLow() public {
        vm.expectRevert(ConviaTreasury.InvalidMemberCount.selector);
        _deployTreasury(alice, 1, block.timestamp, block.timestamp + 12 * 7 days, FREQ, 1);
    }

    // ── InvalidMemberCount: maxMembers > 20 ──────────────────────────────

    function test_Deploy_Revert_MaxMembersTooHigh() public {
        vm.expectRevert(ConviaTreasury.InvalidMemberCount.selector);
        _deployTreasury(alice, 1, block.timestamp, block.timestamp + 12 * 7 days, FREQ, 21);
    }

    // ── ZeroAddress USDC ──────────────────────────────────────────────────

    function test_Deploy_Revert_ZeroAddressUSDC() public {
        vm.expectRevert(ConviaTreasury.ZeroAddress.selector);
        new ConviaTreasury(
            "T", "d", address(0),
            CONTRIBUTION, FREQ,
            block.timestamp - 1, block.timestamp + 30 days,
            alice, 1, TARGET, MAX_MEMBERS,
            new address[](0)
        );
    }

    // ── ZeroAddress creator ───────────────────────────────────────────────

    function test_Deploy_Revert_ZeroAddressCreator() public {
        vm.expectRevert(ConviaTreasury.ZeroAddress.selector);
        new ConviaTreasury(
            "T", "d", address(usdc),
            CONTRIBUTION, FREQ,
            block.timestamp - 1, block.timestamp + 30 days,
            address(0), 1, TARGET, MAX_MEMBERS,
            new address[](0)
        );
    }

    // ── InvalidContributionAmount ─────────────────────────────────────────

    function test_Deploy_Revert_ZeroContributionAmount() public {
        vm.prank(alice);
        vm.expectRevert(ConviaTreasury.InvalidContributionAmount.selector);
        new ConviaTreasury(
            "T", "d", address(usdc),
            0, FREQ,
            block.timestamp - 1, block.timestamp + 30 days,
            alice, 1, TARGET, MAX_MEMBERS,
            new address[](0)
        );
    }

    // ── InvalidFrequency ─────────────────────────────────────────────────

    function test_Deploy_Revert_InvalidFrequency() public {
        vm.prank(alice);
        vm.expectRevert(ConviaTreasury.InvalidFrequency.selector);
        new ConviaTreasury(
            "T", "d", address(usdc),
            CONTRIBUTION, 5,
            block.timestamp - 1, block.timestamp + 30 days,
            alice, 1, TARGET, MAX_MEMBERS,
            new address[](0)
        );
    }

    // ── InvalidTimestamps (end <= start) ─────────────────────────────────

    function test_Deploy_Revert_InvalidTimestamps() public {
        vm.prank(alice);
        uint256 ts = block.timestamp - 1;
        vm.expectRevert(ConviaTreasury.InvalidTimestamps.selector);
        new ConviaTreasury(
            "T", "d", address(usdc),
            CONTRIBUTION, FREQ,
            ts, ts,          // end == start
            alice, 1, TARGET, MAX_MEMBERS,
            new address[](0)
        );
    }

    // ── StartTooFarInPast ─────────────────────────────────────────────────

    function test_Deploy_Revert_StartTooFarInPast() public {
        // Warp to a concrete timestamp so block.timestamp - 2 days doesn't underflow.
        vm.warp(7 days);

        vm.prank(alice);
        uint256 badStart = block.timestamp - 2 days;
        vm.expectRevert(ConviaTreasury.StartTooFarInPast.selector);
        // End must be a valid multiple of the weekly period so the modulo check
        // passes and we reach the StartTooFarInPast check.
        new ConviaTreasury(
            "T", "d", address(usdc),
            CONTRIBUTION, FREQ,
            badStart, badStart + 12 * 7 days,
            alice, 1, TARGET, MAX_MEMBERS,
            new address[](0)
        );
    }
}
