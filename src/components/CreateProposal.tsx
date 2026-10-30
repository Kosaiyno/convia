import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { isAddress } from 'viem'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, CheckCircle, ExternalLink } from 'lucide-react'
import { useContractUSDCBalance, useIsMember } from '../hooks/useTreasury'
import { formatUsdc, parseUsdcInput } from '../lib/format'
import { TREASURY_ABI, CHAIN_ID } from '../lib/contract'
import { parseOnchainError } from '../lib/errors'
import { buildTxExplorerUrl } from '@/onchain-facts'

interface CreateProposalProps {
  onNavigate: (v: string, params?: Record<string, string>) => void
  treasuryAddress: `0x${string}` | null
}

export function CreateProposal({ onNavigate, treasuryAddress }: CreateProposalProps) {
  const { address, chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const wrongChain = isConnected && chainId !== CHAIN_ID
  const nav = treasuryAddress ? { treasury: treasuryAddress } : undefined

  const { data: balance } = useContractUSDCBalance(treasuryAddress)
  const { data: isMember } = useIsMember(treasuryAddress, address)

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [expiryDays, setExpiryDays] = useState('7')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!isAddress(recipient)) errs.recipient = 'Invalid wallet address'
    const amt = parseUsdcInput(amount)
    if (amt <= 0n) errs.amount = 'Amount must be greater than 0'
    const balanceBig = balance != null ? BigInt(balance as bigint) : undefined
    if (balanceBig !== undefined && amt > balanceBig)
      errs.amount = `Exceeds treasury balance (${formatUsdc(balanceBig)} USDC)`
    if (!reason.trim()) errs.reason = 'Please add a reason'
    const days = parseInt(expiryDays)
    if (isNaN(days) || days < 1 || days > 90) errs.expiry = 'Expiry must be 1–90 days'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + parseInt(expiryDays) * 86400)
    const amt = parseUsdcInput(amount)
    writeContract(
      {
        address: treasuryAddress ?? '0x0000000000000000000000000000000000000000',
        abi: TREASURY_ABI,
        functionName: 'createProposal',
        args: [recipient as `0x${string}`, amt, reason, expiresAt],
        chainId: CHAIN_ID,
      },
      {
        onSuccess: () => toast.success('Withdrawal request submitted…'),
        onError: (e) => {
          const msg = parseOnchainError(e)
          if (!msg.includes('cancelled')) toast.error(msg)
        },
      },
    )
  }

  const txUrl = hash ? buildTxExplorerUrl(CHAIN_ID, hash) : undefined

  if (isSuccess) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('proposals', nav)} className="btn-back">
            <ArrowLeft className="size-4" style={{ color: 'var(--ink)' }} />
          </button>
          <h1 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>Request Withdrawal</h1>
        </div>
        <div className="hero-card p-8 flex flex-col items-center text-center space-y-4">
          <div
            className="flex size-14 items-center justify-center rounded-2xl"
            style={{ background: 'var(--success-bg)' }}
          >
            <CheckCircle className="size-7" style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--ink)' }}>Withdrawal request submitted!</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Members can now approve it. Once the threshold is reached, anyone can execute.</p>
          </div>
          {txUrl && (
            <a href={txUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
              View transaction <ExternalLink className="size-3" />
            </a>
          )}
          <button onClick={() => onNavigate('proposals', nav)} className="btn-primary w-full">
            View Withdrawals
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => onNavigate('proposals', nav)} className="btn-back">
          <ArrowLeft className="size-4" style={{ color: 'var(--ink)' }} />
        </button>
        <h1 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>Request Withdrawal</h1>
      </div>

      {!isConnected && (
        <p className="text-sm rounded-2xl p-3" style={{ color: 'var(--muted)', background: 'var(--surface-muted)' }}>
          Connect your wallet to submit a withdrawal request.
        </p>
      )}
      {isConnected && isMember === false && (
        <p className="text-sm rounded-2xl p-3" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
          Your wallet is not a member of this treasury.
        </p>
      )}

      <div className="glass rounded-3xl p-5 space-y-4">
        {/* Balance pill */}
        <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'var(--accent-light)' }}>
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Available in treasury</span>
          <span className="display text-sm font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
            {balance != null ? formatUsdc(balance as bigint) : '—'} USDC
          </span>
        </div>

        {/* Recipient */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--ink)' }}>
            Send to address
          </label>
          <input className="input" placeholder="0x..." value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          {errors.recipient && <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors.recipient}</p>}
        </div>

        {/* Amount */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--ink)' }}>
            Amount (USDC)
          </label>
          <input
            className="input display text-lg font-bold tabular-nums"
            placeholder="0.00"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, '')
              if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v)
            }}
          />
          {errors.amount && <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors.amount}</p>}
        </div>

        {/* Reason */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--ink)' }}>
            Reason
          </label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="What is this withdrawal for?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {errors.reason && <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors.reason}</p>}
        </div>

        {/* Expiry */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--ink)' }}>
            Voting window (days)
          </label>
          <input
            className="input"
            type="number"
            min={1}
            max={90}
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
          />
          {errors.expiry && <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors.expiry}</p>}
        </div>

        {wrongChain ? (
          <button onClick={() => switchChain({ chainId: CHAIN_ID })} className="btn-primary w-full">
            Switch to Arc Testnet
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!isConnected || isMember === false || isPending || confirming}
            className="btn-primary w-full py-3.5"
          >
            {isPending
              ? <><Loader2 className="size-4 animate-spin" /> Confirm in wallet…</>
              : confirming
              ? <><Loader2 className="size-4 animate-spin" /> Confirming…</>
              : 'Submit Withdrawal Request'
            }
          </button>
        )}
      </div>
    </div>
  )
}
