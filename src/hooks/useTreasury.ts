/**
 * Hooks for interacting with ConviaTreasury instances and the ConviaTreasuryFactory.
 * Treasury address is passed as a parameter — supports multiple treasuries.
 */
import { useReadContract, useReadContracts } from 'wagmi'
import { CONVIA_FACTORY, TREASURY_ABI, CHAIN_ID, USDC_ADDRESS } from '../lib/contract'
import { erc20Abi } from 'viem'

// ─── Factory hooks ────────────────────────────────────────────────────────────

export function useAllTreasuries() {
  return useReadContract({
    ...CONVIA_FACTORY,
    functionName: 'getAllTreasuries',
    chainId: CHAIN_ID,
  })
}

export function useTreasuriesCreatedBy(address: string | undefined) {
  return useReadContract({
    ...CONVIA_FACTORY,
    functionName: 'getTreasuriesCreatedBy',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
    chainId: CHAIN_ID,
  })
}

// ─── Treasury-instance helper ─────────────────────────────────────────────────

function treasuryContract(address: `0x${string}` | null) {
  return {
    address: address ?? ('0x0000000000000000000000000000000000000000'),
    abi: TREASURY_ABI,
    chainId: CHAIN_ID,
  }
}

// ─── Treasury info ────────────────────────────────────────────────────────────

export function useTreasuryInfo(treasuryAddress: `0x${string}` | null) {
  return useReadContract({
    ...treasuryContract(treasuryAddress),
    functionName: 'getTreasuryInfo',
    query: { enabled: !!treasuryAddress },
  })
}

export function useContractUSDCBalance(treasuryAddress: `0x${string}` | null) {
  return useReadContract({
    ...treasuryContract(treasuryAddress),
    functionName: 'getContractUSDCBalance',
    query: { enabled: !!treasuryAddress },
  })
}

export function useCurrentPeriod(treasuryAddress: `0x${string}` | null) {
  return useReadContract({
    ...treasuryContract(treasuryAddress),
    functionName: 'getCurrentPeriod',
    query: { enabled: !!treasuryAddress },
  })
}

export function useTotalPeriods(treasuryAddress: `0x${string}` | null) {
  return useReadContract({
    ...treasuryContract(treasuryAddress),
    functionName: 'getTotalPeriods',
    query: { enabled: !!treasuryAddress },
  })
}

export function useMembers(treasuryAddress: `0x${string}` | null) {
  return useReadContract({
    ...treasuryContract(treasuryAddress),
    functionName: 'getMembers',
    query: { enabled: !!treasuryAddress },
  })
}

export function useIsMember(treasuryAddress: `0x${string}` | null, walletAddress: string | undefined) {
  return useReadContract({
    ...treasuryContract(treasuryAddress),
    functionName: 'isMember',
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: !!treasuryAddress && !!walletAddress, refetchInterval: 4000 },
  })
}

export function useContributionHistory(treasuryAddress: `0x${string}` | null) {
  return useReadContract({
    ...treasuryContract(treasuryAddress),
    functionName: 'getContributionHistory',
    query: { enabled: !!treasuryAddress },
  })
}

export function useMemberContribution(
  treasuryAddress: `0x${string}` | null,
  walletAddress: string | undefined,
) {
  return useReadContract({
    ...treasuryContract(treasuryAddress),
    functionName: 'getMemberContribution',
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: !!treasuryAddress && !!walletAddress },
  })
}

export function useProposalCount(treasuryAddress: `0x${string}` | null) {
  return useReadContract({
    ...treasuryContract(treasuryAddress),
    functionName: 'proposalCount',
    query: { enabled: !!treasuryAddress },
  })
}

export function useAllProposals(treasuryAddress: `0x${string}` | null, count: number) {
  const contracts = Array.from({ length: count }, (_, i) => ({
    ...treasuryContract(treasuryAddress),
    functionName: 'getProposal' as const,
    args: [BigInt(i)] as const,
  }))
  return useReadContracts({ contracts, query: { enabled: !!treasuryAddress && count > 0 } })
}

export function useHasApproved(
  treasuryAddress: `0x${string}` | null,
  proposalId: bigint | undefined,
  walletAddress: string | undefined,
) {
  return useReadContract({
    ...treasuryContract(treasuryAddress),
    functionName: 'hasApproved',
    args: proposalId !== undefined && walletAddress ? [proposalId, walletAddress] : undefined,
    query: { enabled: !!treasuryAddress && proposalId !== undefined && !!walletAddress, refetchInterval: 4000 },
  })
}

// ─── Join-flow hooks ──────────────────────────────────────────────────────────


// ─── USDC wallet hooks ────────────────────────────────────────────────────────

export function useWalletUSDCBalance(walletAddress: string | undefined) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress as `0x${string}`] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!walletAddress },
  })
}

export function useUSDCAllowance(
  walletAddress: string | undefined,
  spender: `0x${string}`,
) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: walletAddress ? [walletAddress as `0x${string}`, spender] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!walletAddress },
  })
}
