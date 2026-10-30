// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ConviaTreasury is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ===== Errors =====
    error ZeroAddress();
    error InvalidContributionAmount();
    error InvalidFrequency();
    error InvalidTimestamps();
    error StartTooFarInPast();
    error InvalidMemberCount();
    error TreasuryFull();
    error DuplicateMember();
    error InvalidRequiredApprovals();
    error NotMember();
    error AlreadyMember();
    error ContributionPeriodInactive();
    error AlreadyContributedThisPeriod();
    error InvalidProposalId();
    error InvalidRecipient();
    error InvalidProposalAmount();
    error InsufficientTreasuryBalance();
    error InvalidExpiry();
    error ProposalExpired();
    error ProposalAlreadyCancelled();
    error ProposalAlreadyExecuted();
    error CannotApproveOwnProposal();
    error AlreadyApproved();
    error NotProposer();
    error NotEnoughApprovals();
    error TreasuryHasOneMember();
    error InvalidPeriodIndex();

    // ===== Constants =====
    uint8 public constant FREQUENCY_WEEKLY     = 0;
    uint8 public constant FREQUENCY_BIWEEKLY   = 1;
    uint8 public constant FREQUENCY_MONTHLY    = 2;

    uint256 private constant WEEKLY_DURATION   = 7 days;
    uint256 private constant BIWEEKLY_DURATION = 14 days;
    uint256 private constant MONTHLY_DURATION  = 30 days;

    // ===== Treasury Configuration =====
    string  public name;
    string  public description;
    address public immutable usdcToken;
    uint256 public contributionAmount;
    uint8   public frequency;
    uint256 public startTimestamp;
    uint256 public endTimestamp;
    uint8   public requiredApprovals;
    uint256 public targetAmount;
    uint8   public maxMembers;

    // ===== Membership =====
    address[] public members;
    mapping(address => bool) public memberStatus;

    // ===== Contribution Tracking =====
    mapping(address => mapping(uint256 => bool)) public contributed;
    mapping(address => uint256) public totalContributed;

    struct ContributionRecord {
        address member;
        uint256 period;
        uint256 amount;
        uint256 timestamp;
    }
    ContributionRecord[] public contributionHistory;

    // ===== Spending Proposals =====
    struct Proposal {
        uint256 id;
        address proposer;
        address recipient;
        uint256 amount;
        string  reason;
        uint256 expiresAt;
        bool    executed;
        bool    cancelled;
        uint256 approvalCount;
        mapping(address => bool) approvals;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private proposals;

    // ===== Events =====
    event TreasuryCreated(string name, address creator, uint8 maxMembers, uint8 requiredApprovals);
    event MemberJoined(address indexed member);
    event ContributionMade(address indexed member, uint256 indexed period, uint256 amount, uint256 timestamp);
    event ProposalCreated(uint256 indexed id, address indexed proposer, address recipient, uint256 amount, string reason, uint256 expiresAt);
    event ProposalApproved(uint256 indexed proposalId, address indexed approver, uint256 approvalCount);
    event ProposalCancelled(uint256 indexed proposalId, address indexed canceller);
    event ProposalExecuted(uint256 indexed proposalId, address indexed executor, address recipient, uint256 amount);

    modifier onlyMember() {
        if (!memberStatus[msg.sender]) revert NotMember();
        _;
    }

    // ===== Constructor =====
    constructor(
        string memory  _name,
        string memory  _description,
        address        _usdcToken,
        uint256        _contributionAmount,
        uint8          _frequency,
        uint256        _startTimestamp,
        uint256        _endTimestamp,
        address        _creator,
        uint8          _requiredApprovals,
        uint256        _targetAmount,
        uint8          _maxMembers,
        address[] memory _extraMembers   // optional pre-added members (can be empty)
    ) {
        if (_usdcToken          == address(0)) revert ZeroAddress();
        if (_creator            == address(0)) revert ZeroAddress();
        if (_contributionAmount == 0)          revert InvalidContributionAmount();
        if (_frequency > FREQUENCY_MONTHLY)    revert InvalidFrequency();
        if (_endTimestamp <= _startTimestamp)   revert InvalidTimestamps();
        if ((_endTimestamp - _startTimestamp) % _computePeriodDuration(_frequency) != 0) revert InvalidTimestamps();
        if (_startTimestamp + 1 days < block.timestamp) revert StartTooFarInPast();
        if (_maxMembers < 2 || _maxMembers > 20) revert InvalidMemberCount();
        if (_requiredApprovals < 1 || _requiredApprovals > _maxMembers - 1) revert InvalidRequiredApprovals();

        name               = _name;
        description        = _description;
        usdcToken          = _usdcToken;
        contributionAmount = _contributionAmount;
        frequency          = _frequency;
        startTimestamp     = _startTimestamp;
        endTimestamp       = _endTimestamp;
        targetAmount       = _targetAmount;
        requiredApprovals  = _requiredApprovals;
        maxMembers         = _maxMembers;

        // Add creator
        _addMember(_creator);

        // Add any extra members the creator already knows
        for (uint256 i = 0; i < _extraMembers.length; i++) {
            if (_extraMembers[i] == address(0)) revert ZeroAddress();
            _addMember(_extraMembers[i]);
        }

        emit TreasuryCreated(_name, _creator, _maxMembers, _requiredApprovals);
    }

    // ===== Join (permissionless — link = permission) =====

    /// Anyone with the share link can call this to join, up to maxMembers.
    function joinTreasury() external {
        if (memberStatus[msg.sender]) revert AlreadyMember();
        if (members.length >= maxMembers) revert TreasuryFull();
        _addMember(msg.sender);
    }

    // ===== Contributions =====

    function contribute() external onlyMember nonReentrant {
        if (block.timestamp < startTimestamp || block.timestamp >= endTimestamp)
            revert ContributionPeriodInactive();

        uint256 period = (block.timestamp - startTimestamp) / _periodDuration();
        if (contributed[msg.sender][period]) revert AlreadyContributedThisPeriod();

        contributed[msg.sender][period]      = true;
        totalContributed[msg.sender]        += contributionAmount;

        IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), contributionAmount);

        contributionHistory.push(ContributionRecord({
            member:    msg.sender,
            period:    period,
            amount:    contributionAmount,
            timestamp: block.timestamp
        }));

        emit ContributionMade(msg.sender, period, contributionAmount, block.timestamp);
    }

    // ===== Proposals =====

    function createProposal(address recipient, uint256 amount, string calldata reason, uint256 expiresAt)
        external onlyMember returns (uint256 proposalId)
    {
        if (members.length < 2)      revert TreasuryHasOneMember();
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount    == 0)          revert InvalidProposalAmount();
        if (expiresAt <= block.timestamp) revert InvalidExpiry();
        if (amount > IERC20(usdcToken).balanceOf(address(this))) revert InsufficientTreasuryBalance();

        proposalId         = proposalCount++;
        Proposal storage p = proposals[proposalId];
        p.id        = proposalId;
        p.proposer  = msg.sender;
        p.recipient = recipient;
        p.amount    = amount;
        p.reason    = reason;
        p.expiresAt = expiresAt;

        emit ProposalCreated(proposalId, msg.sender, recipient, amount, reason, expiresAt);
    }

    function approveProposal(uint256 proposalId) external onlyMember {
        if (proposalId >= proposalCount) revert InvalidProposalId();
        Proposal storage p = proposals[proposalId];
        if (p.proposer == msg.sender)       revert CannotApproveOwnProposal();
        if (p.executed)                     revert ProposalAlreadyExecuted();
        if (p.cancelled)                    revert ProposalAlreadyCancelled();
        if (block.timestamp >= p.expiresAt) revert ProposalExpired();
        if (p.approvals[msg.sender])        revert AlreadyApproved();

        p.approvals[msg.sender] = true;
        p.approvalCount++;
        emit ProposalApproved(proposalId, msg.sender, p.approvalCount);
    }

    function cancelProposal(uint256 proposalId) external {
        if (proposalId >= proposalCount) revert InvalidProposalId();
        Proposal storage p = proposals[proposalId];
        if (p.proposer != msg.sender) revert NotProposer();
        if (p.executed)               revert ProposalAlreadyExecuted();
        if (p.cancelled)              revert ProposalAlreadyCancelled();
        p.cancelled = true;
        emit ProposalCancelled(proposalId, msg.sender);
    }

    function executeProposal(uint256 proposalId) external onlyMember nonReentrant {
        if (proposalId >= proposalCount) revert InvalidProposalId();
        Proposal storage p = proposals[proposalId];
        if (p.executed)                     revert ProposalAlreadyExecuted();
        if (p.cancelled)                    revert ProposalAlreadyCancelled();
        if (block.timestamp >= p.expiresAt) revert ProposalExpired();
        uint256 effectiveApprovals = members.length - 1 < requiredApprovals ? members.length - 1 : requiredApprovals;
        if (p.approvalCount < effectiveApprovals) revert NotEnoughApprovals();
        if (p.amount == 0)                  revert InvalidProposalAmount();
        if (IERC20(usdcToken).balanceOf(address(this)) < p.amount) revert InsufficientTreasuryBalance();

        p.executed = true;
        IERC20(usdcToken).safeTransfer(p.recipient, p.amount);
        emit ProposalExecuted(proposalId, msg.sender, p.recipient, p.amount);
    }

    // ===== Views =====

    function getTreasuryInfo() external view returns (
        string memory treasuryName,
        string memory treasuryDescription,
        address       treasuryUsdcToken,
        uint256       treasuryContributionAmount,
        uint8         treasuryFrequency,
        uint256       treasuryStartTimestamp,
        uint256       treasuryEndTimestamp,
        uint8         treasuryRequiredApprovals,
        uint256       treasuryTargetAmount,
        uint256       treasuryMemberCount,
        uint8         treasuryMaxMembers
    ) {
        treasuryName               = name;
        treasuryDescription        = description;
        treasuryUsdcToken          = usdcToken;
        treasuryContributionAmount = contributionAmount;
        treasuryFrequency          = frequency;
        treasuryStartTimestamp     = startTimestamp;
        treasuryEndTimestamp       = endTimestamp;
        treasuryRequiredApprovals  = requiredApprovals;
        treasuryTargetAmount       = targetAmount;
        treasuryMemberCount        = members.length;
        treasuryMaxMembers         = maxMembers;
    }

    function isMember(address member)          external view returns (bool)    { return memberStatus[member]; }
    function getMembers()                       external view returns (address[] memory) { return members; }
    function getMemberCount()                   external view returns (uint256) { return members.length; }
    function getContractUSDCBalance()           external view returns (uint256) { return IERC20(usdcToken).balanceOf(address(this)); }
    function getContributionHistory()           external view returns (ContributionRecord[] memory) { return contributionHistory; }
    function getTotalPeriods()                  public  view returns (uint256) { return (endTimestamp - startTimestamp) / _periodDuration(); }

    function getCurrentPeriod() public view returns (uint256) {
        if (block.timestamp < startTimestamp)  return 0;
        uint256 tp = getTotalPeriods();
        if (tp == 0)                           return 0;
        if (block.timestamp >= endTimestamp)   return tp - 1;
        return (block.timestamp - startTimestamp) / _periodDuration();
    }

    function getPeriodStart(uint256 periodIndex) external view returns (uint256) {
        if (periodIndex >= getTotalPeriods()) revert InvalidPeriodIndex();
        return startTimestamp + (periodIndex * _periodDuration());
    }

    function getPeriodEnd(uint256 periodIndex) external view returns (uint256) {
        if (periodIndex >= getTotalPeriods()) revert InvalidPeriodIndex();
        return startTimestamp + ((periodIndex + 1) * _periodDuration());
    }

    function getMemberContribution(address member) external view
        returns (uint256 memberTotalContributed, uint256 periodsCompleted, uint256 periodsMissed)
    {
        memberTotalContributed = totalContributed[member];
        uint256 elapsed = _elapsedPeriods();
        for (uint256 p = 0; p < elapsed; p++) {
            if (contributed[member][p]) periodsCompleted++;
            else                        periodsMissed++;
        }
    }

    function getProposal(uint256 proposalId) external view returns (
        uint256 id, address proposer, address recipient, uint256 amount,
        string memory reason, uint256 expiresAt, bool executed, bool cancelled, uint256 approvalCount
    ) {
        if (proposalId >= proposalCount) revert InvalidProposalId();
        Proposal storage p = proposals[proposalId];
        id = p.id; proposer = p.proposer; recipient = p.recipient; amount = p.amount;
        reason = p.reason; expiresAt = p.expiresAt; executed = p.executed;
        cancelled = p.cancelled; approvalCount = p.approvalCount;
    }

    function hasApproved(uint256 proposalId, address member) external view returns (bool) {
        if (proposalId >= proposalCount) revert InvalidProposalId();
        return proposals[proposalId].approvals[member];
    }

    // ===== Internal =====

    function _addMember(address member) internal {
        if (memberStatus[member]) revert DuplicateMember();
        if (members.length >= maxMembers) revert TreasuryFull();
        memberStatus[member] = true;
        members.push(member);
        emit MemberJoined(member);
    }

    function _periodDuration() internal view returns (uint256) {
        return _computePeriodDuration(frequency);
    }

    function _computePeriodDuration(uint8 freq) internal pure returns (uint256) {
        if (freq == FREQUENCY_WEEKLY)   return WEEKLY_DURATION;
        if (freq == FREQUENCY_BIWEEKLY) return BIWEEKLY_DURATION;
        return MONTHLY_DURATION;
    }

    function _elapsedPeriods() internal view returns (uint256) {
        if (block.timestamp <= startTimestamp) return 0;
        if (block.timestamp >= endTimestamp)   return getTotalPeriods();
        return (block.timestamp - startTimestamp) / _periodDuration();
    }
}
