import { ConnectKitButton } from 'connectkit'
import { useAccount, useSwitchChain } from 'wagmi'
import { arcMainnet } from '@/config'
import { AlertTriangle } from 'lucide-react'
import { CHAIN_ID } from '../lib/contract'

interface ShellProps { children: React.ReactNode }

// Convia wordmark — teal initials box + logotype
function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex size-8 items-center justify-center rounded-xl text-white text-sm font-bold"
        style={{ background: 'var(--accent)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}
      >
        C
      </div>
      <span className="display text-lg font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}>
        Convia
      </span>
    </div>
  )
}

export function Shell({ children }: ShellProps) {
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const wrongChain = isConnected && chainId !== CHAIN_ID

  return (
    <div className="relative min-h-dvh overflow-x-hidden" style={{ background: 'var(--bg-gradient)' }}>
      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div style={{
          position: 'absolute', top: '-10%', left: '-8%',
          width: 420, height: 420, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(10,79,82,0.10) 0%, transparent 70%)',
          filter: 'blur(70px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', right: '-5%',
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,205,131,0.18) 0%, transparent 70%)',
          filter: 'blur(65px)',
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '20%',
          width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(95,190,255,0.10) 0%, transparent 70%)',
          filter: 'blur(55px)',
        }} />
      </div>

      {/* Nav */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'rgba(248,246,241,0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Logo />
          <ConnectKitButton />
        </div>
      </header>

      {/* Wrong network banner */}
      {wrongChain && (
        <div className="flex items-center justify-between px-4 py-2.5 text-sm font-medium"
          style={{ background: 'var(--warn-bg)', color: 'var(--warn-text)', borderBottom: '1px solid #fde047' }}>
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Switch to Arc to continue.
          </span>
          <button
            onClick={() => switchChain({ chainId: arcMainnet.id })}
            disabled={isPending}
            className="rounded-lg px-3 py-1 text-xs font-bold"
            style={{ background: 'var(--warn-text)', color: '#fef9c3' }}
          >
            {isPending ? 'Switching…' : 'Switch'}
          </button>
        </div>
      )}

      <main className="relative z-10 mx-auto max-w-4xl px-6 pb-12 pt-6">
        {children}
      </main>
    </div>
  )
}
