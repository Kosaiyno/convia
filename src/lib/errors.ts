export function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  const shortMsg = (error as { shortMessage?: string })?.shortMessage ?? ''

  if (msg.includes('user rejected') || msg.includes('user denied') || msg.includes('4001')) {
    return 'Transaction cancelled.'
  }
  if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) {
    return 'Insufficient USDC balance. Please add funds and try again.'
  }
  if (shortMsg.includes('NotMember') || msg.includes('notmember')) {
    return 'You are not a member of this treasury.'
  }
  if (shortMsg.includes('AlreadyContributedThisPeriod') || msg.includes('alreadycontributedthisperiod')) {
    return 'You have already contributed for this period.'
  }
  if (shortMsg.includes('ContributionPeriodInactive') || msg.includes('contributionperiodinactive')) {
    return 'The contribution period is not currently active.'
  }
  if (shortMsg.includes('NotEnoughApprovals') || msg.includes('notenoughapprovals')) {
    return 'Not enough approvals to execute this proposal yet.'
  }
  if (shortMsg.includes('ProposalExpired') || msg.includes('proposalexpired')) {
    return 'This proposal has expired.'
  }
  if (shortMsg.includes('ProposalAlreadyExecuted') || msg.includes('proposalalreadyexecuted')) {
    return 'This proposal has already been executed.'
  }
  if (shortMsg.includes('ProposalAlreadyCancelled') || msg.includes('proposalalreadycancelled')) {
    return 'This proposal has been cancelled.'
  }
  if (shortMsg.includes('CannotApproveOwnProposal') || msg.includes('cannotapproveownproposal')) {
    return 'You cannot approve your own proposal.'
  }
  if (shortMsg.includes('AlreadyApproved') || msg.includes('alreadyapproved')) {
    return 'You have already approved this proposal.'
  }
  if (shortMsg.includes('InsufficientTreasuryBalance') || msg.includes('insufficienttreasurybalance')) {
    return 'The treasury does not have enough USDC for this proposal.'
  }
  if (msg.includes('reverted')) {
    const reason = msg.match(/reason="([^"]+)"/)
    return reason ? `Transaction failed: ${reason[1]}` : 'Transaction failed. Please try again.'
  }
  if (msg.includes('network') || msg.includes('timeout')) {
    return 'Network error. Please check your connection and retry.'
  }
  return 'Something went wrong. Please try again.'
}
