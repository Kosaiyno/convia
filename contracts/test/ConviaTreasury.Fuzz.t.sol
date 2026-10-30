// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ConviaTreasuryBase} from "./ConviaTreasury.Base.t.sol";
import {ConviaTreasury} from "../ConviaTreasury.sol";

/// Tests: fuzz over contributionAmount, maxMembers, and proposal fields (Case 21).
contract ConviaTreasuryFuzzTest is ConviaTreasuryBase {

    // setUp adds bob so the base treasury has 2 members, then both contribute to seed funds.
    function setUp() public override {
        super.setUp();
        _fundAndApprove(bob, CONTRIBUTION * 100);
        _addMember(bob, alice);
        // Seed the treasury with 2 * CONTRIBUTION so proposal tests have balance to work with.
        vm.prank(alice);
        treasury.contribute();
        vm.prank(bob);
        treasury.contribute();
    }

    // ── Case 21a: Fuzz contributionAmount ────────────────────────────────
    // Any non-zero contribution amount within 1 USDC – 10,000 USDC (6 dec) should work.

    function testFuzz_ContributionAmount(uint256 amount) public {
        amount = bound(amount, 1e6, 10_000e6); // 1 USDC … 10,000 USDC

        // Deploy fresh treasury with this contribution amount (alice as creator).
        vm.prank(alice);
        ConviaTreasury ft = new ConviaTreasury(
            "FuzzTreasury", "d", address(usdc),
            amount,
            FREQ,
            block.timestamp,
            block.timestamp + 12 * 7 days,
            alice,
            1,
            amount * 100,
            MAX_MEMBERS,
            new address[](0)
        );

        assertEq(ft.contributionAmount(), amount);

        // Alice funds, approves, contributes
        usdc.mint(alice, amount);
        vm.prank(alice);
        usdc.approve(address(ft), amount);
        vm.prank(alice);
        ft.contribute();

        assertEq(usdc.balanceOf(address(ft)), amount);
        assertEq(ft.totalContributed(alice), amount);
    }

    // ── Case 21b: Fuzz maxMembers (2..20) ────────────────────────────────
    // Deploy a treasury with fuzzed maxMembers; creator is alice; verify cap is stored.

    function testFuzz_MaxMembers(uint8 rawMax) public {
        uint8 maxM = uint8(bound(uint256(rawMax), 2, 20));
        // requiredApprovals must be in [1, maxM-1]
        uint8 req  = uint8(bound(uint256(rawMax), 1, uint256(maxM) - 1));

        vm.prank(alice);
        ConviaTreasury ft = new ConviaTreasury(
            "FuzzMaxMembers", "d", address(usdc),
            CONTRIBUTION,
            FREQ,
            block.timestamp,
            block.timestamp + 12 * 7 days,
            alice,
            req,
            TARGET,
            maxM,
            new address[](0)
        );

        assertEq(ft.maxMembers(), maxM);
        assertEq(ft.getMemberCount(), 1); // only creator
        assertTrue(ft.isMember(alice));
        assertEq(ft.requiredApprovals(), req);
    }

    // ── Fuzz: proposal amount bounded by treasury balance ────────────────

    function testFuzz_ProposalAmount(uint256 amount) public {
        // setUp already seeded treasury with 2 * CONTRIBUTION.
        uint256 balance = usdc.balanceOf(address(treasury));
        // Bound to [1, balance] so it's always valid
        amount = bound(amount, 1, balance);

        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, amount, "fuzz", block.timestamp + 1 days);

        (, , , uint256 storedAmount, , , , , ) = treasury.getProposal(pid);
        assertEq(storedAmount, amount);
    }

    // ── Fuzz: expiry timestamp ────────────────────────────────────────────

    function testFuzz_ProposalExpiry(uint256 futureSeconds) public {
        // setUp already seeded treasury with 2 * CONTRIBUTION.
        futureSeconds = bound(futureSeconds, 1, 365 days);
        uint256 expiry = block.timestamp + futureSeconds;

        vm.prank(alice);
        uint256 pid = treasury.createProposal(recipient, CONTRIBUTION, "fuzz", expiry);

        (, , , , , uint256 storedExpiry, , , ) = treasury.getProposal(pid);
        assertEq(storedExpiry, expiry);
    }

    // ── Fuzz: warp forward and ensure period accounting is consistent ─────

    function testFuzz_PeriodAccounting(uint256 warpSeconds) public {
        // Warp anywhere within the active window but at least 1 period forward
        warpSeconds = bound(warpSeconds, 7 days, 60 days);
        vm.warp(block.timestamp + warpSeconds);

        // After warping, getCurrentPeriod should be >= 1
        uint256 period = treasury.getCurrentPeriod();
        assertTrue(period >= 1);

        // totalPeriods must not underflow
        uint256 total = treasury.getTotalPeriods();
        assertTrue(total > 0);
    }
}
