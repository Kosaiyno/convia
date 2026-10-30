import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { erc20Abi } from 'viem'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, CheckCircle, ExternalLink } from 'lucide-react'
import {
  useTreasuryInfo,
  useCurrentPeriod,
  useWalletUSDCBalance,
  useUSDCAllowance,
  useIsMember,
  useContributionHistory,
} from '../hooks/useTreasury'
import { formatUsdc } from '../lib/format'
import { TREASURY_ABI, USDC_ADDRESS, CHAIN_ID } from '../lib/contract'
import { parseOnchainError } from '../lib/errors'
import { buildTxExplorerUrl } from '@/onchain-facts'

interface ContributeProps {
  onNavigate: (v: string, params?: Record<string, string>) => void
  treasuryAddress: `0x${string}` | null
}

export function Contribute({ onNavigate, treasuryAddress }: ContributeProps) {
  const { address, chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const wrongChain = isConnected && chainId !== CHAIN_ID

  const { data: info } = useTreasuryInfo(treasuryAddress)
  const { data: currentPeriod } = useCurrentPeriod(treasuryAddress)
  const { data: balance } = useWalletUSDCBalance(address)
  const { data: allowance, refetch: refetchAllowance } = useUSDCAllowance(address, (treasuryAddress ?? '0x0000000000000000000000000000000000000000'))
  const { data: isMemberRaw } = useIsMember(treasuryAddress, address)
  const isMember = isMemberRaw as boolean | undefined
  const { data: history } = useContributionHistory(treasuryAddress)

  const [now] = useState(() => Math.floor(Date.now() / 1000))
  const [step, setStep] = useState<'idle' | 'approving' | 'contributing' | 'done'>('idle')

  const { writeContract: approveWrite, data: approveHash, isPending: approvePending } = useWriteContract()
  const { isLoading: approveConfirming, isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract: contributeWrite, data: contributeHash, isPending: contributePending } = useWriteContract()
  const { isLoading: contributeConfirming, isSuccess: contributeConfirmed } = useWaitForTransactionReceipt({
    hash: contributeHash,
  })

  if (!info) return null

  const [, , , contributionAmount, , startTimestamp, endTimestamp] = info as [
    string, string, string, bigint, number, bigint, bigint, number, bigint, bigint
  ]

  const isActive = now >= Number(startTimestamp) && now < Number(endTimestamp)
  const periodNumber = currentPeriod !== undefined ? Number(currentPeriod) : 0

  const historyArr = (history as Array<{ member: string; period: bigint; amount: bigint; timestamp: bigint }>) ?? []
  const alreadyContributed = historyArr.some(
    (h) =>
      h.member.toLowerCase() === address?.toLowerCase() &&
      Number(h.period) === periodNumber,
  )

  const needsApproval = allowance !== undefined && allowance < contributionAmount

  const handleApprove = () => {
    if (!address) return
    setStep('approving')
    approveWrite(
      {
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [(treasuryAddress ?? '0x0000000000000000000000000000000000000000'), contributionAmount],
        chainId: CHAIN_ID,
      },
      {
        onSuccess: () => {
          toast.success('Approval submitted, waiting for confirmation…')
        },
        onError: (e) => {
          setStep('idle')
          const msg = parseOnchainError(e)
          if (!msg.includes('cancelled')) toast.error(msg)
        },
      },
    )
  }

  const handleContribute = () => {
    if (!address) return
    setStep('contributing')
    contributeWrite(
      {
        address: treasuryAddress ?? '0x0000000000000000000000000000000000000000',
        abi: TREASURY_ABI,
        functionName: 'contribute',
        chainId: CHAIN_ID,
      },
      {
        onSuccess: () => {
          toast.success('Contribution submitted, confirming…')
        },
        onError: (e) => {
          setStep('idle')
          const msg = parseOnchainError(e)
          if (!msg.includes('cancelled')) toast.error(msg)
        },
      },
    )
  }

  // After approval confirmed, refetch and go to contribute
  if (approveConfirmed && step === 'approving') {
    void refetchAllowance()
    setStep('idle')
  }

  const isLoading = approvePending || approveConfirming || contributePending || contributeConfirming
  const isSuccess = contributeConfirmed

  const txUrl = contributeHash
    ? buildTxExplorerUrl(CHAIN_ID, contributeHash)
    : undefined

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => onNavigate('dashboard', treasuryAddress ? { treasury: treasuryAddress } : undefined)} className="btn-back">
          <ArrowLeft className="size-4" style={{ color: 'var(--ink)' }} />
        </button>
        <h1 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>Contribute</h1>
      </div>

      {/* ── Hero amount card ────────────────────────────────────────── */}
      <div className="hero-card p-5 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>
          {isActive ? `Period #${periodNumber + 1} · Amount due` : 'Contribution'}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
            {formatUsdc(contributionAmount)}
          </span>
          <span className="text-xl font-semibold" style={{ color: 'var(--subtle)' }}>USDC</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Your balance: <span className="font-semibold tabular-nums">{balance !== undefined ? formatUsdc(balance) : '—'} USDC</span>
        </p>
      </div>

      <div className="glass rounded-3xl p-5 space-y-4">
        {/* Status messages */}
        {!isConnected && (
          <p className="rounded-xl p-3 text-sm" style={{ color: 'var(--muted)', background: 'var(--surface-muted)' }}>
            Connect your wallet to contribute.
          </p>
        )}
        {isConnected && isMember === false && (
          <p className="rounded-xl p-3 text-sm font-medium" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
            Your wallet is not a member of this treasury.
          </p>
        )}
        {isConnected && isMember && !isActive && now >= Number(endTimestamp) && (
          <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--warn-bg)', border: '1px solid #fde047' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--warn-text)' }}>This treasury has ended</p>
            <p className="text-xs leading-relaxed" style={{ color: '#854d0e' }}>
              No more contributions can be made. Submit a withdrawal request to move remaining funds.
            </p>
            <button
              onClick={() => onNavigate('proposals', treasuryAddress ? { treasury: treasuryAddress } : undefined)}
              className="rounded-xl px-4 py-2 text-xs font-bold"
              style={{ background: 'var(--warn-text)', color: '#fef9c3' }}
            >
              Request a withdrawal
            </button>
          </div>
        )}
        {isConnected && isMember && !isActive && now < Number(endTimestamp) && (
          <div className="rounded-xl p-3" style={{ background: 'var(--accent-light)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Not started yet</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--accent-mid)' }}>
              Contributions open on {new Date(Number(startTimestamp) * 1000).toLocaleDateString()}.
            </p>
          </div>
        )}
        {isConnected && isMember && isActive && alreadyContributed && !isSuccess && (
          <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: 'var(--success-bg)' }}>
            <CheckCircle className="size-4 flex-shrink-0" style={{ color: 'var(--success)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
              You've contributed for period #{periodNumber + 1}
            </p>
          </div>
        )}

        {/* Success */}
        {isSuccess && (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="flex size-12 items-center justify-center rounded-2xl" style={{ background: 'var(--success-bg)' }}>
              <CheckCircle className="size-6" style={{ color: 'var(--success)' }} />
            </div>
            <p className="font-bold" style={{ color: 'var(--ink)' }}>Contribution confirmed!</p>
            {txUrl && (
              <a href={txUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
                View on ArcScan <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        )}

        {/* CTA */}
        {!isSuccess && isConnected && isMember && isActive && !alreadyContributed && (
          wrongChain ? (
            <button onClick={() => switchChain({ chainId: CHAIN_ID })} className="btn-primary w-full py-3.5">
              Switch to Arc Testnet
            </button>
          ) : needsApproval ? (
            <button onClick={handleApprove} disabled={isLoading} className="btn-primary w-full py-3.5">
              {approvePending
                ? <><Loader2 className="size-4 animate-spin" /> Confirm in wallet…</>
                : approveConfirming
                ? <><Loader2 className="size-4 animate-spin" /> Allowing USDC…</>
                : 'Allow USDC spending'
              }
            </button>
          ) : (
            <button onClick={handleContribute} disabled={isLoading} className="btn-primary w-full py-3.5">
              {contributePending
                ? <><Loader2 className="size-4 animate-spin" /> Confirm in wallet…</>
                : contributeConfirming
                ? <><Loader2 className="size-4 animate-spin" /> Confirming…</>
                : `Contribute ${formatUsdc(contributionAmount)} USDC`
              }
            </button>
          )
        )}
      </div>

      <p className="text-center text-xs pb-2" style={{ color: 'var(--subtle)' }}>
        Smart contracts don't enforce when members contribute — this is a social commitment.
      </p>
    </div>
  )
}
