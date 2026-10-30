import { useAccount } from 'wagmi'
import { ArrowLeft } from 'lucide-react'
import { useMembers, useMemberContribution } from '../hooks/useTreasury'
import { formatAddress, formatUsdc } from '../lib/format'

interface MembersProps {
  treasuryAddress: `0x${string}`
  onNavigate: (v: string, params?: Record<string, string>) => void
}

function MemberRow({ addr, treasuryAddress, isYou }: { addr: string; treasuryAddress: `0x${string}`; isYou: boolean }) {
  const { data: contribRaw } = useMemberContribution(treasuryAddress, addr)
  const contrib = contribRaw as [bigint, bigint, bigint] | undefined
  const total = contrib ? (contrib[0]) : undefined
  const completed = contrib ? Number(contrib[1]) : undefined
  const missed = contrib ? Number(contrib[2]) : undefined

  return (
    <div className="activity-row gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex size-9 items-center justify-center rounded-xl text-white text-sm font-bold flex-shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          {addr.slice(2, 4).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="mono text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{formatAddress(addr)}</p>
            {isYou && (
              <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>You</span>
            )}
          </div>
          {completed !== undefined && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {completed} paid · {missed} missed
            </p>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {total !== undefined && (
          <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
            {formatUsdc(total)} <span style={{ color: 'var(--muted)' }}>USDC</span>
          </p>
        )}
      </div>
    </div>
  )
}

export function Members({ treasuryAddress, onNavigate }: MembersProps) {
  const { address } = useAccount()
  const { data: membersRaw } = useMembers(treasuryAddress)
  const members = (membersRaw as string[] | undefined) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button className="btn-back" onClick={() => onNavigate('dashboard', { treasury: treasuryAddress })}>
          <ArrowLeft className="size-4" style={{ color: 'var(--ink)' }} />
        </button>
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Members</h1>
      </div>

      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="display font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>
            Current Members
          </h2>
          <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            {members.length}
          </span>
        </div>

        {members.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No members yet.</p>
        )}

        <div className="space-y-2">
          {members.map(m => (
            <MemberRow
              key={m}
              addr={m}
              treasuryAddress={treasuryAddress}
              isYou={m.toLowerCase() === address?.toLowerCase()}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
