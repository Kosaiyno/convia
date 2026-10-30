// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ConviaTreasuryBase} from "./ConviaTreasury.Base.t.sol";
import {ConviaTreasury} from "../ConviaTreasury.sol";

/// Tests: joinTreasury — permissionless join flow.
contract ConviaTreasuryJoinTest is ConviaTreasuryBase {

    // Base setUp gives us: treasury with alice as sole creator (REQ_APPROVALS=1, MAX_MEMBERS=5).

    // ─────────────────────────────────────────────────────────────────────────
    // joinTreasury — happy path
    // ─────────────────────────────────────────────────────────────────────────

    function test_JoinTreasury_HappyPath() public {
        vm.prank(bob);
        treasury.joinTreasury();

        assertTrue(treasury.isMember(bob));
        assertEq(treasury.getMemberCount(), 2);
    }

    function test_JoinTreasury_EmitsMemberJoined() public {
        vm.prank(bob);
        vm.expectEmit(true, false, false, false, address(treasury));
        emit ConviaTreasury.MemberJoined(bob);
        treasury.joinTreasury();
    }

    function test_JoinTreasury_MultipleMembers() public {
        vm.prank(bob);
        treasury.joinTreasury();

        vm.prank(carol);
        treasury.joinTreasury();

        assertTrue(treasury.isMember(bob));
        assertTrue(treasury.isMember(carol));
        assertEq(treasury.getMemberCount(), 3);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // joinTreasury — revert: AlreadyMember
    // ─────────────────────────────────────────────────────────────────────────

    function test_JoinTreasury_Revert_AlreadyMember_Creator() public {
        // alice is already a member as the creator
        vm.prank(alice);
        vm.expectRevert(ConviaTreasury.AlreadyMember.selector);
        treasury.joinTreasury();
    }

    function test_JoinTreasury_Revert_AlreadyMember_AfterJoin() public {
        vm.prank(bob);
        treasury.joinTreasury();

        vm.prank(bob);
        vm.expectRevert(ConviaTreasury.AlreadyMember.selector);
        treasury.joinTreasury();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // joinTreasury — revert: TreasuryFull
    // ─────────────────────────────────────────────────────────────────────────

    function test_JoinTreasury_Revert_TreasuryFull() public {
        // Deploy a 2-member-cap treasury (alice creator + 1 open slot).
        vm.prank(alice);
        ConviaTreasury small = new ConviaTreasury(
            "Small", "d", address(usdc),
            CONTRIBUTION, FREQ,
            block.timestamp, block.timestamp + 12 * 7 days,
            alice, 1, TARGET, 2,
            new address[](0)
        );

        // bob fills the last slot
        vm.prank(bob);
        small.joinTreasury();

        assertEq(small.getMemberCount(), 2);

        // carol tries to join — treasury is full
        vm.prank(carol);
        vm.expectRevert(ConviaTreasury.TreasuryFull.selector);
        small.joinTreasury();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // extraMembers constructor arg
    // ─────────────────────────────────────────────────────────────────────────

    function test_Constructor_ExtraMembers_AddedAtDeploy() public {
        address[] memory extras = new address[](2);
        extras[0] = bob;
        extras[1] = carol;

        vm.prank(alice);
        ConviaTreasury t = new ConviaTreasury(
            "WithExtras", "d", address(usdc),
            CONTRIBUTION, FREQ,
            block.timestamp, block.timestamp + 12 * 7 days,
            alice, 1, TARGET, MAX_MEMBERS,
            extras
        );

        assertEq(t.getMemberCount(), 3);
        assertTrue(t.isMember(alice));
        assertTrue(t.isMember(bob));
        assertTrue(t.isMember(carol));
    }

    function test_Constructor_ExtraMembers_EmptyArray() public {
        vm.prank(alice);
        ConviaTreasury t = new ConviaTreasury(
            "NoExtras", "d", address(usdc),
            CONTRIBUTION, FREQ,
            block.timestamp, block.timestamp + 12 * 7 days,
            alice, 1, TARGET, MAX_MEMBERS,
            new address[](0)
        );

        assertEq(t.getMemberCount(), 1);
        assertTrue(t.isMember(alice));
    }

    function test_Constructor_ExtraMembers_Revert_ZeroAddress() public {
        address[] memory extras = new address[](1);
        extras[0] = address(0);

        vm.expectRevert(ConviaTreasury.ZeroAddress.selector);
        new ConviaTreasury(
            "BadExtra", "d", address(usdc),
            CONTRIBUTION, FREQ,
            block.timestamp, block.timestamp + 12 * 7 days,
            alice, 1, TARGET, MAX_MEMBERS,
            extras
        );
    }

    function test_Constructor_ExtraMembers_Revert_TreasuryFull() public {
        // maxMembers=2, creator + 2 extras = 3 > cap → TreasuryFull
        address[] memory extras = new address[](2);
        extras[0] = bob;
        extras[1] = carol;

        vm.expectRevert(ConviaTreasury.TreasuryFull.selector);
        new ConviaTreasury(
            "Overflow", "d", address(usdc),
            CONTRIBUTION, FREQ,
            block.timestamp, block.timestamp + 12 * 7 days,
            alice, 1, TARGET, 2,
            extras
        );
    }
}
