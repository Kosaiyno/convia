import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { CheckCircle, Loader2, XCircle, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { TREASURY_ABI, CHAIN_ID } from '../lib/contract'
import { useTreasuryInfo, useIsMember } from '../hooks/useTreasury'
import { parseOnchainError } from '../lib/errors'
import { formatUsdc, formatAddress } from '../lib/format'
import { FREQUENCY_LABEL } from '../lib/contract'

interface JoinTreasuryProps {
  treasuryAddress: `0x${string}`
  onJoined: () => void
  onBack: () => void
}

export function JoinTreasury({ treasuryAddress, onJoined, onBack }: JoinTreasuryProps) {
  const { address, isConnected } = useAccount()
  const { data: infoRaw, refetch: refetchInfo } = useTreasuryInfo(treasuryAddress)
  const { data: isMemberRaw, refetch: refetchMember } = useIsMember(treasuryAddress, address)

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const info = infoRaw as [string, string, string, bigint, number, bigint, bigint, number, bigint, bigint, number] | undefined
  const isMember = isMemberRaw as boolean | undefined

  // After tx confirms, refetch and navigate in
  if (isSuccess && isMember === true) {
    onJoined()
    return null
  }
  if (isSuccess && isMember !== true) {
    void refetchMember()
    void refetchInfo()
  }

  const name             = info?.[0] ?? ''
  const description      = info?.[1] ?? ''
  const contributionAmt  = info?.[3]
  const freq             = info?.[4]
  const memberCount      = Number(info?.[9] ?? 0)
  const maxMem           = Number(info?.[10] ?? 0)
  const isFull           = maxMem > 0 && memberCount >= maxMem

  function handleJoin() {
    writeContract(
      {
        address: treasuryAddress,
        abi: TREASURY_ABI,
        functionName: 'joinTreasury',
        chainId: CHAIN_ID,
      },
      {
        onError: (err) => toast.error(parseOnchainError(err)),
        onSuccess: () => toast.success('You joined the treasury!'),
      },
    )
  }

  // Already a member — redirect
  if (isMember === true) {
    onJoined()
    return null
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-back">
          <span style={{ fontSize: '1.1rem', color: 'var(--ink)' }}>←</span>
        </button>
        <div>
          <h1 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>You've been invited</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Join this group savings treasury</p>
        </div>
      </div>

      {/* Treasury card */}
      {info ? (
        <div className="hero-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex size-14 items-center justify-center rounded-2xl text-white text-xl font-bold flex-shrink-0"
              style={{ background: 'var(--accent)', fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="display text-lg font-bold truncate" style={{ color: 'var(--ink)' }}>{name}</h2>
              {description && <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{description}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="stat-chip text-center">
              <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Contribution</p>
              <p className="display font-bold mt-0.5" style={{ color: 'var(--ink)' }}>
                {contributionAmt !== undefined ? formatUsdc(contributionAmt) : '—'}
              </p>
            </div>
            <div className="stat-chip text-center">
              <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Frequency</p>
              <p className="display font-bold mt-0.5" style={{ color: 'var(--ink)' }}>
                {freq !== undefined ? FREQUENCY_LABEL[freq] : '—'}
              </p>
            </div>
            <div className="stat-chip text-center">
              <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Members</p>
              <p className="display font-bold mt-0.5" style={{ color: 'var(--ink)' }}>
                {memberCount}/{maxMem}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1" style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>
            <span className="mono">{formatAddress(treasuryAddress)}</span>
          </div>
        </div>
      ) : (
        <div className="hero-card p-6 flex items-center justify-center h-40">
          <Loader2 className="size-6 animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      )}

      {/* Action */}
      {!isConnected ? (
        <div className="glass rounded-2xl p-5 text-center space-y-3">
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Connect your wallet to join</p>
          <ConnectKitButton />
        </div>
      ) : isFull ? (
        <div className="glass rounded-2xl p-5 flex items-center gap-3" style={{ borderColor: 'var(--danger-bg)' }}>
          <XCircle className="size-5 flex-shrink-0" style={{ color: 'var(--danger)' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--danger)' }}>Treasury is full</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>All {maxMem} member slots are taken.</p>
          </div>
        </div>
      ) : isSuccess ? (
        <div className="glass rounded-2xl p-5 flex items-center gap-3">
          <CheckCircle className="size-5 flex-shrink-0" style={{ color: 'var(--success)' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--success)' }}>Joined! Loading your dashboard…</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="glass rounded-2xl p-4 text-sm space-y-1.5" style={{ color: 'var(--ink)' }}>
            <p className="font-semibold">What joining means:</p>
            <p style={{ color: 'var(--muted)' }}>
              You commit to contributing <strong style={{ color: 'var(--ink)' }}>
                {contributionAmt !== undefined ? formatUsdc(contributionAmt) : '…'}
              </strong>{' '}
              {freq !== undefined ? FREQUENCY_LABEL[freq].toLowerCase() : ''} for the duration of this treasury.
              Contributions are enforced onchain.
            </p>
            <p className="text-xs pt-1" style={{ color: 'var(--subtle)' }}>
              Joining as: <span className="mono">{formatAddress(address!)}</span>
            </p>
          </div>

          <button
            className="btn-primary w-full"
            onClick={handleJoin}
            disabled={isPending || isConfirming || !info}
          >
            {isPending || isConfirming
              ? <><Loader2 className="size-4 animate-spin" /> {isConfirming ? 'Confirming…' : 'Confirm in wallet…'}</>
              : <><LogIn className="size-4" /> Join Treasury</>
            }
          </button>
        </div>
      )}
    </div>
  )
}
