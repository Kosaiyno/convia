// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ConviaTreasury} from "./ConviaTreasury.sol";

contract ConviaTreasuryFactory {
    address[] public allTreasuries;
    mapping(address => address[]) public treasuriesCreatedBy;

    event TreasuryCreated(address indexed treasury, address indexed creator, string name);

    function createTreasury(
        string memory    name,
        string memory    description,
        address          usdcToken,
        uint256          contributionAmount,
        uint8            frequency,
        uint256          startTimestamp,
        uint256          endTimestamp,
        uint8            requiredApprovals,
        uint256          targetAmount,
        uint8            maxMembers,
        address[] memory extraMembers   // optional; can be empty []
    ) external returns (address treasury) {
        ConviaTreasury t = new ConviaTreasury(
            name, description, usdcToken, contributionAmount,
            frequency, startTimestamp, endTimestamp,
            msg.sender, requiredApprovals, targetAmount,
            maxMembers, extraMembers
        );
        treasury = address(t);
        allTreasuries.push(treasury);
        treasuriesCreatedBy[msg.sender].push(treasury);
        emit TreasuryCreated(treasury, msg.sender, name);
    }

    function getAllTreasuries()                          external view returns (address[] memory) { return allTreasuries; }
    function getTreasuriesCount()                        external view returns (uint256)          { return allTreasuries.length; }
    function getTreasuriesCreatedBy(address creator)     external view returns (address[] memory) { return treasuriesCreatedBy[creator]; }
}
