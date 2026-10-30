import { ArrowLeft, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useContributionHistory, useAllProposals, useProposalCount } from '../hooks/useTreasury'
import { formatUsdc, formatAddress, formatDateTime } from '../lib/format'

interface HistoryProps {
  onNavigate: (v: string, params?: Record<string, string>) => void
  treasuryAddress: `0x${string}` | null
}

export function History({ onNavigate, treasuryAddress }: HistoryProps) {
  const { data: history, isLoading } = useContributionHistory(treasuryAddress)
  const { data: count } = useProposalCount(treasuryAddress)
  const { data: proposals } = useAllProposals(treasuryAddress, count ? Number(count) : 0)

  type ContribRecord = { member: string; period: bigint; amount: bigint; timestamp: bigint }
  type RawProposal = [bigint, string, string, bigint, string, bigint, boolean, boolean, bigint]

  const historyArr = (history as ContribRecord[]) ?? []
  const executedProposals = (proposals ?? [])
    .map((res) => {
      if (res.status !== 'success' || !res.result) return null
      const r = res.result as RawProposal
      return { id: r[0], proposer: r[1], recipient: r[2], amount: r[3], reason: r[4], executed: r[6] }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null && p.executed)

  const nav = treasuryAddress ? { treasury: treasuryAddress } : undefined

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => onNavigate('dashboard', nav)} className="btn-back">
          <ArrowLeft className="size-4" style={{ color: 'var(--ink)' }} />
        </button>
        <h1 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>History</h1>
      </div>

      {/* ── Contributions ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 display text-sm font-bold" style={{ color: 'var(--ink)' }}>
          Contributions
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--subtle)' }}>({historyArr.length})</span>
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-muted)' }} />
            ))}
          </div>
        ) : historyArr.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No contributions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {historyArr.slice().reverse().map((rec, i) => (
              <div key={i} className="activity-row">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-8 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'var(--success-bg)' }}
                  >
                    <ArrowDownLeft className="size-4" style={{ color: 'var(--success)' }} />
                  </div>
                  <div>
                    <p className="mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {formatAddress(rec.member)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                      Period #{Number(rec.period) + 1} · {formatDateTime(rec.timestamp)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--success)' }}>
                  +{formatUsdc(rec.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Withdrawals ───────────────────────────────────────────── */}
      {executedProposals.length > 0 && (
        <section>
          <h2 className="mb-3 display text-sm font-bold" style={{ color: 'var(--ink)' }}>
            Withdrawals
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--subtle)' }}>({executedProposals.length})</span>
          </h2>
          <div className="space-y-2">
            {executedProposals.map((p) => (
              <div key={Number(p.id)} className="activity-row">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-8 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'var(--danger-bg)' }}
                  >
                    <ArrowUpRight className="size-4" style={{ color: 'var(--danger)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{p.reason}</p>
                    <p className="mono text-xs" style={{ color: 'var(--subtle)' }}>
                      To {formatAddress(p.recipient)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--danger)' }}>
                  -{formatUsdc(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
