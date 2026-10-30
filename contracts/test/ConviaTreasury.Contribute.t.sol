// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ConviaTreasuryBase} from "./ConviaTreasury.Base.t.sol";
import {ConviaTreasury} from "../ConviaTreasury.sol";

/// Tests: contribution happy-paths and all revert paths.
contract ConviaTreasuryContributeTest is ConviaTreasuryBase {

    // setUp adds bob as a member (alice is already creator; REQ_APPROVALS=1 so one approval suffices).
    function setUp() public override {
        super.setUp();
        // Add bob via join flow so two-member tests work.
        _fundAndApprove(bob, CONTRIBUTION * 100);
        _addMember(bob, alice);
    }

    // ── Case 4: Member can contribute USDC ────────────────────────────────

    function test_Contribute_HappyPath() public {
        uint256 balBefore = usdc.balanceOf(address(treasury));

        vm.prank(alice);
        treasury.contribute();

        assertEq(usdc.balanceOf(address(treasury)), balBefore + CONTRIBUTION);
        assertEq(treasury.totalContributed(alice), CONTRIBUTION);
    }

    function test_Contribute_EmitsEvent() public {
        uint256 period = (block.timestamp - START) / 7 days; // weekly

        vm.prank(alice);
        vm.expectEmit(true, true, false, true, address(treasury));
        emit ConviaTreasury.ContributionMade(alice, period, CONTRIBUTION, block.timestamp);
        treasury.contribute();
    }

    function test_Contribute_RecordsHistory() public {
        vm.prank(alice);
        treasury.contribute();

        ConviaTreasury.ContributionRecord[] memory history = treasury.getContributionHistory();
        assertEq(history.length, 1);
        assertEq(history[0].member, alice);
        assertEq(history[0].amount, CONTRIBUTION);
    }

    // ── Case 5: Non-member cannot contribute ─────────────────────────────

    function test_Contribute_Revert_NonMember() public {
        _fundAndApprove(outsider, CONTRIBUTION);

        vm.prank(outsider);
        vm.expectRevert(ConviaTreasury.NotMember.selector);
        treasury.contribute();
    }

    // ── Case 6: Member cannot contribute twice in the same period ─────────

    function test_Contribute_Revert_DoubleContributionSamePeriod() public {
        vm.prank(alice);
        treasury.contribute();

        vm.prank(alice);
        vm.expectRevert(ConviaTreasury.AlreadyContributedThisPeriod.selector);
        treasury.contribute();
    }

    // ── Two members can contribute independently ──────────────────────────

    function test_Contribute_TwoMembersCanContribute() public {
        vm.prank(alice);
        treasury.contribute();

        vm.prank(bob);
        treasury.contribute();

        assertEq(usdc.balanceOf(address(treasury)), CONTRIBUTION * 2);
    }

    // ── Alice contributes in a later period after warping ─────────────────

    function test_Contribute_NextPeriodAllowed() public {
        vm.prank(alice);
        treasury.contribute();

        // Move to next weekly period
        vm.warp(block.timestamp + 7 days);

        // Re-approve for the new call
        vm.prank(alice);
        usdc.approve(address(treasury), CONTRIBUTION);

        vm.prank(alice);
        treasury.contribute(); // should succeed in period 1

        assertEq(treasury.totalContributed(alice), CONTRIBUTION * 2);
    }

    // ── Case 7a: Contributing before startTimestamp fails ─────────────────

    function test_Contribute_Revert_BeforeStart() public {
        uint256 futureStart = block.timestamp + 1 hours;

        vm.prank(alice);
        ConviaTreasury future = new ConviaTreasury(
            "Future", "d", address(usdc),
            CONTRIBUTION, FREQ,
            futureStart, futureStart + 5 * 7 days,  // 35 days = 5 * 604800 (exact multiple)
            alice, 1, TARGET, MAX_MEMBERS,
            new address[](0)
        );

        vm.prank(alice);
        vm.expectRevert(ConviaTreasury.ContributionPeriodInactive.selector);
        future.contribute();
    }

    // ── Case 7b: Contributing after endTimestamp fails ────────────────────

    function test_Contribute_Revert_AfterEnd() public {
        vm.warp(END + 1);

        vm.prank(alice);
        vm.expectRevert(ConviaTreasury.ContributionPeriodInactive.selector);
        treasury.contribute();
    }
}
