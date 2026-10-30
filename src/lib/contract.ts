/**
 * Convia contract configuration.
 * Factory deployed on Arc Mainnet.
 */
import treasuryArtifact from '../../contracts/out/ConviaTreasury.sol/ConviaTreasury.json'
import factoryArtifact from '../../contracts/out/ConviaTreasuryFactory.sol/ConviaTreasuryFactory.json'
import { arcMainnet } from '@/config'
import type { Abi } from 'viem'

export const CHAIN_ID = arcMainnet.id // 5042

/** Factory — creates and tracks all treasury instances */
export const CONVIA_FACTORY = {
  address: '0x6b92b67755EEae73837d80C09B1F11D263cc8D77' as `0x${string}`,
  abi: factoryArtifact.abi as Abi,
  chainId: CHAIN_ID,
}

/** ABI for individual treasury instances (address provided at runtime) */
export const TREASURY_ABI = treasuryArtifact.abi as Abi

// USDC on Arc (same address on mainnet and testnet)
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as `0x${string}`

// Contribution frequency constants
export const FREQUENCY = {
  WEEKLY: 0,
  BIWEEKLY: 1,
  MONTHLY: 2,
} as const

export const FREQUENCY_LABEL: Record<number, string> = {
  0: 'Weekly',
  1: 'Biweekly',
  2: 'Monthly',
}

// Period durations in seconds
export const PERIOD_DURATION: Record<number, number> = {
  0: 7 * 24 * 60 * 60,      // weekly
  1: 14 * 24 * 60 * 60,     // biweekly
  2: 30 * 24 * 60 * 60,     // monthly
}
