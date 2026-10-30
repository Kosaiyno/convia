import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Shell } from './components/Shell'
import { Home } from './components/Home'
import { Dashboard } from './components/Dashboard'
import { Members } from './components/Members'
import { Contribute } from './components/Contribute'
import { Proposals } from './components/Proposals'
import { CreateProposal } from './components/CreateProposal'
import { History } from './components/History'
import { CreateTreasury } from './components/CreateTreasury'
import { JoinTreasury } from './components/JoinTreasury'
import { useIsMember } from './hooks/useTreasury'

type View =
  | 'home'
  | 'create-treasury'
  | 'join'
  | 'dashboard'
  | 'members'
  | 'contribute'
  | 'proposals'
  | 'create-proposal'
  | 'history'

function readUrl(): { view: View; treasury: `0x${string}` | null } {
  const p = new URLSearchParams(window.location.search)
  const t = p.get('t')
  const v = (p.get('v') ?? 'home') as View
  return {
    view: v,
    treasury: t && /^0x[0-9a-fA-F]{40}$/.test(t) ? (t as `0x${string}`) : null,
  }
}

function writeUrl(view: View, treasury: `0x${string}` | null) {
  const p = new URLSearchParams()
  if (treasury) p.set('t', treasury)
  if (view !== 'home') p.set('v', view)
  const search = p.toString() ? `?${p.toString()}` : ''
  window.history.pushState({}, '', `${window.location.pathname}${search}`)
}

// Gate: if a treasury address is in the URL and the wallet is not a member,
// redirect to the join screen (unless they're already on the join screen).
function useMemberGate(
  view: View,
  treasury: `0x${string}` | null,
  navigate: (v: View, t: `0x${string}` | null) => void,
) {
  const { address, isConnected } = useAccount()
  const { data: isMemberRaw } = useIsMember(treasury, address)
  const isMember = isMemberRaw as boolean | undefined

  useEffect(() => {
    if (!treasury) return
    if (!isConnected) return
    if (view === 'join' || view === 'home' || view === 'create-treasury') return
    // Only redirect once we have a definitive false (not undefined/loading)
    if (isMember === false) {
      navigate('join', treasury)
    }
  }, [treasury, isConnected, isMember, view, navigate])
}

export default function App() {
  const init = readUrl()
  const [view, setView]     = useState<View>(init.view)
  const [treasury, setTreasury] = useState<`0x${string}` | null>(init.treasury)

  function navigate(newView: string, params?: Record<string, string>) {
    const v = newView as View
    const t = params?.treasury as `0x${string}` | undefined ?? treasury
    setView(v)
    setTreasury(t ?? null)
    writeUrl(v, t ?? null)
    window.scrollTo(0, 0)
  }

  function navigateInternal(v: View, t: `0x${string}` | null) {
    setView(v)
    setTreasury(t)
    writeUrl(v, t)
    window.scrollTo(0, 0)
  }

  // Restore state on browser back/forward
  useEffect(() => {
    function onPop() {
      const { view: v, treasury: t } = readUrl()
      setView(v)
      setTreasury(t)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useMemberGate(view, treasury, navigateInternal)

  const addr = treasury

  return (
    <Shell>
      {view === 'home' && <Home onNavigate={navigate} />}
      {view === 'create-treasury' && <CreateTreasury onNavigate={navigate} />}
      {view === 'join' && addr && (
        <JoinTreasury
          treasuryAddress={addr}
          onJoined={() => navigate('dashboard', { treasury: addr })}
          onBack={() => navigate('home')}
        />
      )}
      {view === 'dashboard'       && addr && <Dashboard       treasuryAddress={addr} onNavigate={navigate} />}
      {view === 'members'         && addr && <Members         treasuryAddress={addr} onNavigate={navigate} />}
      {view === 'contribute'      && addr && <Contribute      treasuryAddress={addr} onNavigate={navigate} />}
      {view === 'proposals'       && addr && <Proposals       treasuryAddress={addr} onNavigate={navigate} />}
      {view === 'create-proposal' && addr && <CreateProposal  treasuryAddress={addr} onNavigate={navigate} />}
      {view === 'history'         && addr && <History         treasuryAddress={addr} onNavigate={navigate} />}
    </Shell>
  )
}
