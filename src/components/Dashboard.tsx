import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ArrowLeft, Users, DollarSign, Vote, History, Share2, Lock, TrendingUp } from 'lucide-react'
import {
  useTreasuryInfo, useContractUSDCBalance, useCurrentPeriod,
  useTotalPeriods, useMembers, useContributionHistory, useIsMember,
} from '../hooks/useTreasury'
import { formatUsdc, formatDateTime, formatDate } from '../lib/format'
import { FREQUENCY_LABEL } from '../lib/contract'
import { buildShareLink } from '../lib/share'

interface DashboardProps {
  onNavigate: (v: string, params?: Record<string, string>) => void
  treasuryAddress: `0x${string}` | null
}

export function Dashboard({ onNavigate, treasuryAddress }: DashboardProps) {
  const [now] = useState(() => Math.floor(Date.now() / 1000))
  const [copied, setCopied] = useState(false)
  const { address, isConnected } = useAccount()
  const { data: info, isLoading } = useTreasuryInfo(treasuryAddress)
  const { data: balance } = useContractUSDCBalance(treasuryAddress)
  const { data: currentPeriod } = useCurrentPeriod(treasuryAddress)
  const { data: totalPeriods } = useTotalPeriods(treasuryAddress)
  const { data: members } = useMembers(treasuryAddress)
  const { data: history } = useContributionHistory(treasuryAddress)
  const { data: isMemberRaw, isLoading: isMemberLoading } = useIsMember(treasuryAddress, address)
  const isMember = isMemberRaw as boolean | undefined

  const handleShare = async () => {
    if (!treasuryAddress) return
    const link = await buildShareLink(`?t=${treasuryAddress}&v=dashboard`)
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading || (isConnected && isMemberLoading)) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-3xl animate-pulse" style={{ background: 'var(--surface-muted)' }} />
        ))}
      </div>
    )
  }

  if (!info) return null

  // ── Member gate ───────────────────────────────────────────────────────────
  if (isConnected && isMember === false) {
    const name = (info as [string, ...unknown[]])[0]
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('home')} className="btn-back">
            <ArrowLeft className="size-4" style={{ color: 'var(--ink)' }} />
          </button>
          <h1 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>{String(name)}</h1>
        </div>
        <div className="hero-card p-8 flex flex-col items-center text-center space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl" style={{ background: 'var(--surface-muted)' }}>
            <Lock className="size-7" style={{ color: 'var(--subtle)' }} />
          </div>
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--ink)' }}>Members only</p>
            <p className="mt-1.5 text-sm max-w-xs text-pretty" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              Your connected wallet is not a member of this treasury. Ask a current member to add you, or check you are using the right wallet.
            </p>
          </div>
          <button onClick={() => onNavigate('home')} className="btn-ghost">
            Back to home
          </button>
        </div>
      </div>
    )
  }

  // ── Normal dashboard ──────────────────────────────────────────────────────
  const [name, description, , contributionAmount, frequency, startTimestamp, endTimestamp, requiredApprovals, targetAmount, memberCount] = info as [
    string, string, string, bigint, number, bigint, bigint, number, bigint, bigint
  ]

  const periodNumber = currentPeriod !== undefined ? Number(currentPeriod) : 0
  const totalPeriodCount = totalPeriods !== undefined ? Number(totalPeriods) : 0
  const isActive = now >= Number(startTimestamp) && now < Number(endTimestamp)
  const hasEnded = now >= Number(endTimestamp)

  const historyArr = (history as Array<{ member: string; period: bigint; amount: bigint; timestamp: bigint }>) ?? []
  const contributedThisPeriod = new Set(
    historyArr.filter((r) => Number(r.period) === periodNumber).map((r) => r.member.toLowerCase()),
  )
  const memberList = (members as string[]) ?? []
  const pendingCount = memberList.length - contributedThisPeriod.size
  const progress = targetAmount > 0n && balance != null
    ? Math.min(100, (Number(balance) / Number(targetAmount)) * 100)
    : null

  const nav = treasuryAddress ? { treasury: treasuryAddress } : undefined

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => onNavigate('home')} className="btn-back">
            <ArrowLeft className="size-4" style={{ color: 'var(--ink)' }} />
          </button>
          <div className="min-w-0">
            <h1 className="display text-xl font-bold truncate" style={{ color: 'var(--ink)' }}>{name}</h1>
            {description && <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{description}</p>}
          </div>
        </div>
        <button
          onClick={() => { void handleShare() }}
          className="flex-shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
          style={{
            background: copied ? 'var(--accent-light)' : 'var(--surface-strong)',
            color: copied ? 'var(--accent)' : 'var(--ink)',
            border: '1px solid var(--border)',
          }}
        >
          <Share2 className="size-3.5" />
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* ── Balance hero card ───────────────────────────────────────── */}
      <div className="hero-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>
              Treasury Balance
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                {balance != null ? formatUsdc(balance as bigint) : '—'}
              </span>
              <span className="text-lg font-semibold" style={{ color: 'var(--subtle)' }}>USDC</span>
            </div>
          </div>
          <span
            className="badge mt-1"
            style={{
              background: hasEnded ? 'var(--surface-muted)' : isActive ? 'var(--accent-light)' : '#fef9c3',
              color: hasEnded ? 'var(--subtle)' : isActive ? 'var(--accent)' : '#713f12',
            }}
          >
            {hasEnded ? 'Ended' : isActive ? 'Active' : 'Not started'}
          </span>
        </div>

        {progress !== null && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
              <span className="flex items-center gap-1"><TrendingUp className="size-3" /> Goal: {formatUsdc(targetAmount)} USDC</span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>{progress.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
            </div>
          </div>
        )}

        <p className="mt-3 text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
          {formatDate(startTimestamp)} – {formatDate(endTimestamp)}
        </p>
      </div>

      {/* ── Treasury ended banner ───────────────────────────────────── */}
      {hasEnded && (
        <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--warn-bg)', border: '1px solid #fde047' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--warn-text)' }}>This treasury has ended</p>
          <p className="text-xs leading-relaxed" style={{ color: '#854d0e' }}>
            No new contributions can be made. Remaining USDC can be withdrawn — any member submits a request, the group votes, then anyone executes the transfer.
          </p>
          <button
            onClick={() => onNavigate('proposals', nav)}
            className="rounded-xl px-4 py-2 text-xs font-bold"
            style={{ background: 'var(--warn-text)', color: '#fef9c3' }}
          >
            Request a withdrawal
          </button>
        </div>
      )}

      {/* ── Stats grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Period', value: isActive ? `#${periodNumber + 1} of ${totalPeriodCount}` : '—' },
          { label: 'Per contribution', value: `${formatUsdc(contributionAmount)} USDC` },
          { label: 'Contributed', value: `${contributedThisPeriod.size} / ${memberList.length}` },
          { label: 'Awaiting', value: `${pendingCount} member${pendingCount !== 1 ? 's' : ''}` },
        ].map(({ label, value }) => (
          <div key={label} className="stat-chip">
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>{label}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Details pill ────────────────────────────────────────────── */}
      <div
        className="glass rounded-2xl px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4"
      >
        {[
          { label: 'Frequency', value: FREQUENCY_LABEL[frequency] },
          { label: 'Members', value: String(Number(memberCount)) },
          { label: 'Approvals needed', value: String(requiredApprovals) },
          { label: 'Total periods', value: String(totalPeriodCount) },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>{label}</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Quick nav tiles ──────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Members',     view: 'members',       icon: <Users    className="size-4" /> },
          { label: 'Contribute',  view: 'contribute',    icon: <DollarSign className="size-4" /> },
          { label: 'Withdrawals', view: 'proposals',     icon: <Vote     className="size-4" /> },
          { label: 'History',     view: 'history',       icon: <History  className="size-4" /> },
        ].map(({ label, view, icon }) => (
          <button
            key={view}
            onClick={() => onNavigate(view, nav)}
            className="nav-tile"
          >
            <span style={{ color: 'var(--accent)' }}>{icon}</span>
            <span style={{ color: 'var(--ink)' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Recent activity ──────────────────────────────────────────── */}
      {historyArr.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="display text-sm font-bold" style={{ color: 'var(--ink)' }}>Recent contributions</h2>
            <button
              onClick={() => onNavigate('history', nav)}
              className="text-xs font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              See all
            </button>
          </div>
          <div className="space-y-2">
            {historyArr.slice().reverse().slice(0, 4).map((rec, i) => (
              <div key={i} className="activity-row">
                <div>
                  <p className="mono text-xs font-medium" style={{ color: 'var(--ink)' }}>
                    {rec.member.slice(0, 6)}…{rec.member.slice(-4)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                    Period #{Number(rec.period) + 1} · {formatDateTime(rec.timestamp)}
                  </p>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--success)' }}>
                  +{formatUsdc(rec.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
