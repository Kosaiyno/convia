import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { decodeEventLog, isAddress } from 'viem'
import { ArrowLeft, Loader2, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { CONVIA_FACTORY, USDC_ADDRESS, CHAIN_ID } from '../lib/contract'
import { parseOnchainError } from '../lib/errors'
import { parseUsdcInput } from '../lib/format'
import { buildShareLink } from '../lib/share'
import { toast } from 'sonner'

interface CreateTreasuryProps {
  onNavigate: (v: string, params?: Record<string, string>) => void
}

const FREQ_OPTIONS = [
  { value: 0, label: 'Weekly', days: 7 },
  { value: 1, label: 'Every 2 weeks', days: 14 },
  { value: 2, label: 'Monthly', days: 30 },
]

export function CreateTreasury({ onNavigate }: CreateTreasuryProps) {
  const { address, chainId } = useAccount()
  const wrongChain = chainId !== CHAIN_ID

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [contributionAmount, setContributionAmount] = useState('')
  const [frequency, setFrequency] = useState(2)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [requiredApprovals, setRequiredApprovals] = useState(1)
  const [targetAmount, setTargetAmount] = useState('')
  const [maxMembers, setMaxMembers] = useState(5)
  const [extraMembers, setExtraMembers] = useState<string[]>([])

  const { writeContract, data: txHash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash })

  // Derive the new treasury address from the TreasuryCreated event in the receipt
  const newTreasuryAddress = (() => {
    if (!receipt || !isSuccess) return null
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: CONVIA_FACTORY.abi,
          data: log.data,
          topics: log.topics,
        })
        if (decoded.eventName === 'TreasuryCreated') {
          const args = decoded.args as unknown as { treasury: `0x${string}` }
          return args.treasury
        }
      } catch { /* skip non-matching logs */ }
    }
    return null
  })()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!address) return

    const amountParsed = parseUsdcInput(contributionAmount)
    if (amountParsed === null || amountParsed === 0n) {
      toast.error('Enter a valid contribution amount')
      return
    }
    // Period durations in seconds
    const periodDurations: Record<number, number> = { 0: 604800, 1: 1209600, 2: 2592000 }
    const periodSecs = periodDurations[frequency]

    // Snap start to midnight UTC, then snap end so (end-start) is an exact multiple of periodSecs
    const startRaw = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000)
    const endRaw   = Math.floor(new Date(endDate   + 'T00:00:00Z').getTime() / 1000)
    if (endRaw <= startRaw) {
      toast.error('End date must be after start date')
      return
    }
    const diff = endRaw - startRaw
    const periods = Math.max(1, Math.round(diff / periodSecs))
    const startTs = BigInt(startRaw)
    const endTs   = BigInt(startRaw + periods * periodSecs)
    const targetParsed = targetAmount ? (parseUsdcInput(targetAmount) ?? 0n) : 0n

    writeContract(
      {
        ...CONVIA_FACTORY,
        functionName: 'createTreasury',
        args: [
          name,
          description,
          USDC_ADDRESS,
          amountParsed,
          frequency,
          startTs,
          endTs,
          requiredApprovals,
          targetParsed,
          maxMembers,
          extraMembers.filter(a => isAddress(a)),
        ],
      },
      {
        onError: err => toast.error(parseOnchainError(err)),
      },
    )
  }

  if (isSuccess && newTreasuryAddress) {
    return (
      <div className="space-y-6">
        <button className="btn-back" onClick={() => onNavigate('home')}>
          <ArrowLeft className="size-4" style={{ color: 'var(--ink)' }} />
        </button>
        <div className="hero-card p-8 text-center space-y-4">
          <CheckCircle className="mx-auto size-14" style={{ color: 'var(--success)' }} />
          <div>
            <h2 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Treasury Created!</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              You are the first member. Share the invite link — anyone with it can join instantly.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              className="btn-primary w-full"
              onClick={() => onNavigate('dashboard', { treasury: newTreasuryAddress })}
            >
              Open Treasury
            </button>
            <button
              className="btn-ghost w-full"
              onClick={() => {
                void buildShareLink(`?t=${newTreasuryAddress}&v=dashboard`).then(url =>
                  navigator.clipboard.writeText(url).then(() => toast.success('Invite link copied!'))
                )
              }}
            >
              Copy Invite Link
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isLoading = isPending || isConfirming

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button className="btn-back" onClick={() => onNavigate('home')}>
          <ArrowLeft className="size-4" style={{ color: 'var(--ink)' }} />
        </button>
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Create Treasury</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <h2 className="display font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>Details</h2>
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Name *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Lagos House Fund" required maxLength={64} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Description</label>
            <input className="input" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What is this treasury for?" maxLength={200} />
          </div>
        </div>

        {/* Contributions */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <h2 className="display font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>Contributions</h2>
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Amount per period (USDC) *</label>
            <input className="input" type="number" min="0.01" step="0.01"
              value={contributionAmount} onChange={e => setContributionAmount(e.target.value)}
              placeholder="e.g. 10" required />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Frequency *</label>
            <div className="grid grid-cols-3 gap-2">
              {FREQ_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className="rounded-xl py-2.5 text-sm font-medium border transition-colors"
                  style={{
                    background: frequency === opt.value ? 'var(--accent)' : 'var(--surface-strong)',
                    color: frequency === opt.value ? '#fff' : 'var(--ink)',
                    borderColor: frequency === opt.value ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Start date *</label>
              <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>End date *</label>
              <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
          </div>
          {startDate && endDate && (() => {
            const periodSecs = [604800, 1209600, 2592000][frequency]
            const diff = (new Date(endDate + 'T00:00:00Z').getTime() - new Date(startDate + 'T00:00:00Z').getTime()) / 1000
            const periods = Math.max(1, Math.round(diff / periodSecs))
            const freqLabel = FREQ_OPTIONS[frequency].label.toLowerCase()
            return (
              <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--surface-strong)', color: 'var(--muted)' }}>
                {periods} {freqLabel} period{periods !== 1 ? 's' : ''} — end date will be snapped to {new Date((Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000) + periods * periodSecs) * 1000).toLocaleDateString()}
              </p>
            )
          })()}
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Savings target (USDC, optional)</label>
            <input className="input" type="number" min="0" step="0.01"
              value={targetAmount} onChange={e => setTargetAmount(e.target.value)}
              placeholder="Leave blank for no target" />
          </div>
        </div>

        {/* Members & governance */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <h2 className="display font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>Members & Governance</h2>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            You are the first member. You can add wallets you know now, or share the invite link later — anyone with the link joins instantly.
          </p>

          {/* Optional extra members */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Add members now (optional)</label>
            {extraMembers.map((addr, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input flex-1"
                  value={addr}
                  onChange={e => setExtraMembers(prev => prev.map((a, j) => j === i ? e.target.value : a))}
                  placeholder="0x…wallet address"
                />
                <button
                  type="button"
                  className="btn-back flex-shrink-0"
                  onClick={() => setExtraMembers(prev => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" style={{ color: 'var(--danger)' }} />
                </button>
              </div>
            ))}
            {extraMembers.length < maxMembers - 1 && (
              <button
                type="button"
                className="btn-ghost w-full text-sm"
                onClick={() => setExtraMembers(prev => [...prev, ''])}
              >
                <Plus className="size-4" /> Add wallet
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Max members *</label>
              <input className="input" type="number" min="2" max="20"
                value={maxMembers} onChange={e => setMaxMembers(Number(e.target.value))}
                required />
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>2–20</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Approvals to withdraw *</label>
              <input className="input" type="number" min="1" max={maxMembers - 1}
                value={requiredApprovals} onChange={e => setRequiredApprovals(Number(e.target.value))}
                required />
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>1 – {maxMembers - 1}</p>
            </div>
          </div>
        </div>

        {wrongChain && (
          <p className="text-sm text-center font-medium" style={{ color: 'var(--danger)' }}>
            Switch to Arc Testnet before creating a treasury.
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading || wrongChain || !address}
          className="btn-primary w-full"
          onClick={() => !isLoading && reset()}
        >
          {isLoading ? (
            <><Loader2 className="size-4 animate-spin" />{isPending ? 'Confirm in wallet…' : 'Creating…'}</>
          ) : 'Create Treasury'}
        </button>
      </form>
    </div>
  )
}
