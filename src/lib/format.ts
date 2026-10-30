export function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function formatUsdc(raw: bigint, decimals = 6): string {
  const units = Number(raw) / Math.pow(10, decimals)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(units)
}

export function formatUsdcFromString(value: string): string {
  const n = parseFloat(value)
  if (isNaN(n)) return '0.00'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function parseUsdcInput(value: string): bigint {
  const n = parseFloat(value)
  if (isNaN(n) || n <= 0) return 0n
  return BigInt(Math.round(n * 1_000_000))
}

export function formatDate(ts: bigint | number): string {
  const ms = Number(ts) * 1000
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(ts: bigint | number): string {
  const ms = Number(ts) * 1000
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeUntil(ts: bigint | number): string {
  const diff = Number(ts) - Math.floor(Date.now() / 1000)
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h`
  const mins = Math.floor((diff % 3600) / 60)
  return `${hours}h ${mins}m`
}
