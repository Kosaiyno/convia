import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Loader2, ExternalLink, Check, Zap } from 'lucide-react'
import { useProposalCount, useAllProposals, useHasApproved, useTreasuryInfo, useIsMember } from '../hooks/useTreasury'
import { formatUsdc, formatAddress, timeUntil } from '../lib/format'
import { TREASURY_ABI, CHAIN_ID } from '../lib/contract'
import { parseOnchainError } from '../lib/errors'
import { buildTxExplorerUrl } from '@/onchain-facts'

interface ProposalsProps {
  onNavigate: (v: string, params?: Record<string, string>) => void
  treasuryAddress: `0x${string}` | null
}

function StatusBadge({ executed, cancelled, expiresAt, nowSec }: {
  executed: boolean; cancelled: boolean; expiresAt: bigint; nowSec: number
}) {
  const expired = !executed && !cancelled && Number(expiresAt) < nowSec
  if (executed)  return <span className="badge" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Executed</span>
  if (cancelled) return <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>Cancelled</span>
  if (expired)   return <span className="badge" style={{ background: 'var(--surface-muted)', color: 'var(--subtle)' }}>Expired</span>
  return <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>Pending</span>
}

function ProposalCard({ proposal, requiredApprovals, treasuryAddress }: {
  proposal: { id: bigint; proposer: string; recipient: string; amount: bigint; reason: string; expiresAt: bigint; executed: boolean; cancelled: boolean; approvalCount: bigint }
  requiredApprovals: number
  treasuryAddress: `0x${string}` | null
}) {
  const { address } = useAccount()
  const { data: hasApprovedRaw, refetch: refetchHasApproved } = useHasApproved(treasuryAddress, proposal.id, address)
  const hasApproved = hasApprovedRaw as boolean | undefined
  const { data: isMemberRaw } = useIsMember(treasuryAddress, address)
  const isMember = isMemberRaw as boolean | undefined
  const [nowSec] = useState(() => Math.floor(Date.now() / 1000))

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: confirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash })

  if (txSuccess) void refetchHasApproved()

  const isExpired  = !proposal.executed && !proposal.cancelled && Number(proposal.expiresAt) < nowSec
  const isPending_ = !proposal.executed && !proposal.cancelled && !isExpired
  const canApprove = isPending_ && isMember === true && hasApproved === false && address?.toLowerCase() !== proposal.proposer.toLowerCase()
  const canExecute = isPending_ && isMember === true && Number(proposal.approvalCount) >= requiredApprovals

  const handleApprove = () => {
    writeContract(
      { address: treasuryAddress ?? '0x0000000000000000000000000000000000000000', abi: TREASURY_ABI, functionName: 'approveProposal', args: [proposal.id], chainId: CHAIN_ID },
      {
        onSuccess: () => toast.success('Approval submitted — waiting for confirmation…'),
        onError: (e) => { const m = parseOnchainError(e); if (!m.includes('cancelled')) toast.error(m) },
      },
    )
  }

  const handleExecute = () => {
    writeContract(
      { address: treasuryAddress ?? '0x0000000000000000000000000000000000000000', abi: TREASURY_ABI, functionName: 'executeProposal', args: [proposal.id], chainId: CHAIN_ID },
      {
        onSuccess: () => toast.success('Executing withdrawal — waiting for confirmation…'),
        onError: (e) => { const m = parseOnchainError(e); if (!m.includes('cancelled')) toast.error(m) },
      },
    )
  }

  const txUrl = hash ? buildTxExplorerUrl(CHAIN_ID, hash) : undefined
  const approvalProgress = Math.min(100, (Number(proposal.approvalCount) / requiredApprovals) * 100)

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono" style={{ color: 'var(--subtle)' }}>#{Number(proposal.id)}</span>
            <StatusBadge executed={proposal.executed} cancelled={proposal.cancelled} expiresAt={proposal.expiresAt} nowSec={nowSec} />
          </div>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{proposal.reason}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="display text-lg font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{formatUsdc(proposal.amount)}</p>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>USDC</p>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p style={{ color: 'var(--subtle)' }}>To</p>
          <p className="mono font-semibold" style={{ color: 'var(--ink)' }}>{formatAddress(proposal.recipient)}</p>
        </div>
        <div>
          <p style={{ color: 'var(--subtle)' }}>By</p>
          <p className="mono font-semibold" style={{ color: 'var(--ink)' }}>{formatAddress(proposal.proposer)}</p>
        </div>
        <div>
          <p style={{ color: 'var(--subtle)' }}>Approvals</p>
          <p className="font-bold" style={{ color: canExecute ? 'var(--success)' : 'var(--ink)' }}>
            {Number(proposal.approvalCount)} / {requiredApprovals}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--subtle)' }}>Expires</p>
          <p className="font-semibold" style={{ color: 'var(--ink)' }}>{timeUntil(proposal.expiresAt)}</p>
        </div>
      </div>

      {/* Approval progress bar */}
      {isPending_ && (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${approvalProgress}%`,
                background: canExecute ? 'var(--success)' : 'var(--accent)',
              }}
            />
          </div>
        </div>
      )}

      {txUrl && (
        <a href={txUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
          View transaction <ExternalLink className="size-3" />
        </a>
      )}

      {/* Actions */}
      {isPending_ && (canApprove || canExecute) && (
        <div className="flex gap-2">
          {canApprove && (
            <button
              onClick={handleApprove}
              disabled={isPending || confirming}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              {isPending || confirming
                ? <><Loader2 className="size-3 animate-spin" /> {isPending ? 'Confirm…' : 'Confirming…'}</>
                : <><Check className="size-3.5" /> Approve</>
              }
            </button>
          )}
          {canExecute && (
            <button
              onClick={handleExecute}
              disabled={isPending || confirming}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold disabled:opacity-40"
              style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid #bbf7d0' }}
            >
              {isPending || confirming
                ? <><Loader2 className="size-3 animate-spin" /> {isPending ? 'Confirm…' : 'Executing…'}</>
                : <><Zap className="size-3.5" /> Execute</>
              }
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function Proposals({ onNavigate, treasuryAddress }: ProposalsProps) {
  const [now] = useState(() => Math.floor(Date.now() / 1000))
  const { data: count } = useProposalCount(treasuryAddress)
  const { data: info } = useTreasuryInfo(treasuryAddress)
  const { data: proposals } = useAllProposals(treasuryAddress, count ? Number(count) : 0)
  const { isConnected } = useAccount()

  const requiredApprovals = info ? Number((info as unknown[])[7]) : 1

  type RawProposal = [bigint, string, string, bigint, string, bigint, boolean, boolean, bigint]

  const proposalList = (proposals ?? [])
    .map((res) => {
      if (res.status !== 'success' || !res.result) return null
      const r = res.result as RawProposal
      return { id: r[0], proposer: r[1], recipient: r[2], amount: r[3], reason: r[4], expiresAt: r[5], executed: r[6], cancelled: r[7], approvalCount: r[8] }
    })
    .filter(Boolean)

  const pending = proposalList.filter((p) => p && !p.executed && !p.cancelled && Number(p.expiresAt) > now)
  const past    = proposalList.filter((p) => p && (p.executed || p.cancelled || Number(p.expiresAt) <= now))
  const nav     = treasuryAddress ? { treasury: treasuryAddress } : undefined

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('dashboard', nav)} className="btn-back">
            <ArrowLeft className="size-4" style={{ color: 'var(--ink)' }} />
          </button>
          <h1 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>Withdrawals</h1>
        </div>
        {isConnected && (
          <button
            onClick={() => onNavigate('create-proposal', nav)}
            className="btn-primary py-2 px-4 text-xs"
          >
            <Plus className="size-3.5" /> Request
          </button>
        )}
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="mb-3 display text-sm font-bold" style={{ color: 'var(--ink)' }}>
            Pending approval <span className="font-normal text-xs" style={{ color: 'var(--subtle)' }}>({pending.length})</span>
          </h2>
          <div className="space-y-3">
            {pending.map((p) => p && (
              <ProposalCard key={Number(p.id)} proposal={p} requiredApprovals={requiredApprovals} treasuryAddress={treasuryAddress} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="mb-3 display text-sm font-bold" style={{ color: 'var(--ink)' }}>
            Completed <span className="font-normal text-xs" style={{ color: 'var(--subtle)' }}>({past.length})</span>
          </h2>
          <div className="space-y-3">
            {past.map((p) => p && (
              <ProposalCard key={Number(p.id)} proposal={p} requiredApprovals={requiredApprovals} treasuryAddress={treasuryAddress} />
            ))}
          </div>
        </div>
      )}

      {proposalList.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No withdrawal requests yet</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Any member can request a withdrawal — it needs group approval before funds move.</p>
          {isConnected && (
            <button
              onClick={() => onNavigate('create-proposal', nav)}
              className="btn-primary mt-4 mx-auto"
            >
              Make a withdrawal request
            </button>
          )}
        </div>
      )}
    </div>
  )
}
