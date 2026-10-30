import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { Plus, ArrowRight, Users, Layers, Vote } from 'lucide-react'
import { useAllTreasuries, useContractUSDCBalance, useTreasuryInfo } from '../hooks/useTreasury'
import { formatUsdc } from '../lib/format'
import { CHAIN_ID, TREASURY_ABI } from '../lib/contract'
import { useReadContracts } from 'wagmi'

interface HomeProps {
  onNavigate: (v: string, params?: Record<string, string>) => void
}

// Single treasury card — only rendered when wallet is a member
function TreasuryListItem({
  treasuryAddress,
  onNavigate,
}: {
  treasuryAddress: `0x${string}`
  onNavigate: (v: string, params?: Record<string, string>) => void
}) {
  const [now] = useState(() => Math.floor(Date.now() / 1000))
  const { data: infoRaw } = useTreasuryInfo(treasuryAddress)
  const { data: balanceRaw } = useContractUSDCBalance(treasuryAddress)

  if (!infoRaw) {
    return <div className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-muted)' }} />
  }

  const info = infoRaw as [string, string, string, bigint, number, bigint, bigint, number, bigint, bigint, number]
  const name = info[0]
  const description = info[1]
  const memberCount = Number(info[9])
  const maxMembers = Number(info[10])
  const balance = balanceRaw as bigint | undefined
  const startTs = Number(info[5])
  const endTs = Number(info[6])
  const isActive = now >= startTs && now < endTs
  const hasEnded = now >= endTs

  return (
    <button
      onClick={() => onNavigate('dashboard', { treasury: treasuryAddress })}
      className="glass w-full rounded-2xl p-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="display font-semibold truncate" style={{ color: 'var(--ink)' }}>{name}</p>
            <span
              className="badge flex-shrink-0"
              style={{
                background: hasEnded ? 'var(--surface-muted)' : isActive ? 'var(--accent-light)' : '#fef9c3',
                color: hasEnded ? 'var(--subtle)' : isActive ? 'var(--accent)' : '#713f12',
              }}
            >
              {hasEnded ? 'Ended' : isActive ? 'Active' : 'Soon'}
            </span>
          </div>
          {description && (
            <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--muted)' }}>{description}</p>
          )}
          <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
            {memberCount}/{maxMembers} members
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          {balance !== undefined && (
            <p className="display font-bold text-base" style={{ color: 'var(--accent)' }}>
              {formatUsdc(balance)} <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>USDC</span>
            </p>
          )}
          <ArrowRight className="ml-auto mt-1 size-4" style={{ color: 'var(--subtle)' }} />
        </div>
      </div>
    </button>
  )
}

// Filters all treasuries to just those the wallet is a member of
function useMemberTreasuries(allAddresses: `0x${string}`[], walletAddress: string | undefined) {
  const contracts = allAddresses.map(addr => ({
    address: addr,
    abi: TREASURY_ABI,
    functionName: 'isMember' as const,
    args: walletAddress ? [walletAddress as `0x${string}`] : undefined,
    chainId: CHAIN_ID,
  }))
  const { data } = useReadContracts({
    contracts,
    query: { enabled: !!walletAddress && allAddresses.length > 0 },
  })
  if (!data) return undefined
  return allAddresses.filter((_, i) => data[i]?.result === true)
}

export function Home({ onNavigate }: HomeProps) {
  const { address, isConnected } = useAccount()
  const { data: allRaw } = useAllTreasuries()
  const allAddresses = (allRaw as `0x${string}`[] | undefined) ?? []
  const memberTreasuries = useMemberTreasuries(allAddresses, address)

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="hero-card p-6 text-center space-y-4">
        <div
          className="mx-auto flex size-14 items-center justify-center rounded-2xl text-white text-2xl font-bold display"
          style={{ background: 'var(--accent)' }}
        >
          C
        </div>
        <div>
          <h1 className="display text-3xl font-bold" style={{ color: 'var(--ink)' }}>Convia</h1>
          <p className="mt-1 text-base" style={{ color: 'var(--muted)' }}>
            Group savings, onchain. Contribute together, withdraw by vote.
          </p>
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center gap-3">
            <ConnectKitButton />
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              Connect your wallet to create or join a treasury
            </p>
          </div>
        ) : (
          <button
            className="btn-primary w-full"
            onClick={() => onNavigate('create-treasury')}
          >
            <Plus className="size-4" />
            Create a Treasury
          </button>
        )}
      </div>

      {/* Feature highlights */}
      {!isConnected && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Layers className="size-5" />, label: 'Structured savings' },
            { icon: <Users className="size-5" />, label: 'Group membership' },
            { icon: <Vote className="size-5" />, label: 'Vote to withdraw' },
          ].map(f => (
            <div key={f.label} className="stat-chip flex flex-col items-center gap-2 py-4 text-center">
              <span style={{ color: 'var(--accent)' }}>{f.icon}</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{f.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Treasury list */}
      {isConnected && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="display font-semibold text-base" style={{ color: 'var(--ink)' }}>
              Your Treasuries
            </h2>
            {memberTreasuries && memberTreasuries.length > 0 && (
              <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                {memberTreasuries.length}
              </span>
            )}
          </div>

          {!memberTreasuries && (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-muted)' }} />
              ))}
            </div>
          )}

          {memberTreasuries && memberTreasuries.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center space-y-3">
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>No treasuries yet</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Create one and share the invite link with your group.
              </p>
              <button className="btn-primary" onClick={() => onNavigate('create-treasury')}>
                <Plus className="size-4" />
                Create a Treasury
              </button>
            </div>
          )}

          {memberTreasuries && memberTreasuries.map(addr => (
            <TreasuryListItem key={addr} treasuryAddress={addr} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}
