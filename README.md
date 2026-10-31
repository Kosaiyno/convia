# Convia — Group Savings Treasury

A decentralized group savings app on Arc where members contribute USDC on a schedule and spending requires approval from a configurable number of members.

Built with [Arc Studio](https://studio.arc.io)

## What It Does

- Groups create a shared USDC treasury with a fixed contribution schedule (weekly, biweekly, or monthly)
- Members join by sharing an invite link — no wallet addresses needed upfront
- Members contribute USDC directly to the contract — no centralized custody
- Withdrawal requests require a threshold of member approvals before any funds move
- Full contribution history, member progress, and withdrawal status are shown onchain

Use cases: group trips, family savings (ajo/susu/stokvel), team events, community fundraisers.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Onchain: Solidity 0.8.28, OpenZeppelin 5.6.1, Foundry
- Web3: wagmi v2, viem v2, ConnectKit
- Chain: Arc Mainnet (Chain ID: 5042) — native gas is USDC
- Design: Space Grotesk + DM Sans

## Live App

https://arc-studio-515b39c396bd44628fef96f2.vercel.app

## Deployed Contracts

| Network | Contract | Address |
|---|---|---|
| Arc Mainnet (Chain ID: 5042) | ConviaTreasuryFactory | `0x6b92b67755EEae73837d80C09B1F11D263cc8D77` |
| Arc Testnet (Chain ID: 5042002) | ConviaTreasuryFactory | `0xf3a3cb27fc9bbb36383aacab5030869f4bb6552a` |

**USDC address (both mainnet and testnet):** `0x3600000000000000000000000000000000000000`

## Network Details

To add Arc Mainnet to MetaMask:

| Field | Value |
|---|---|
| Network Name | Arc |
| RPC URL | `https://rpc.mainnet.arc.io` |
| Chain ID | `5042` |
| Currency Symbol | `USDC` |
| Block Explorer | `https://explorer.arc.io` |

To add Arc Testnet to MetaMask:

| Field | Value |
|---|---|
| Network Name | Arc Testnet |
| RPC URL | `https://rpc.testnet.arc.io` |
| Chain ID | `5042002` |
| Currency Symbol | `USDC` |
| Block Explorer | `https://explorer.testnet.arc.io` |

## Development

### Prerequisites

- [Bun](https://bun.sh) runtime
- [Foundry](https://book.getfoundry.sh) for contract development

### Install

```bash
bun install
```

### Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy base URL | Optional (Arc Studio only) |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy auth token | Optional (Arc Studio only) |
| `RPC_PROXY_CHAINS` | Comma-separated supported chains | Optional (Arc Studio only) |
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | Optional (injected wallet only is default) |

### Run

```bash
bun run dev
```

### Build

```bash
bunx vite build
```

### Test Contracts

```bash
forge test               # runs all 66 unit tests
forge build              # compile contracts
```

## Security

Two balanced security reviews were conducted in Arc Studio. Findings identified and fixed before deployment:

1. **Fund deadlock** — `requiredApprovals` is now capped at `min(requiredApprovals, members.length - 1)` so funds remain withdrawable even if member count shrinks below the original threshold.
2. **Period alignment** — the constructor enforces that `(endTimestamp - startTimestamp)` is an exact multiple of the contribution period duration, preventing inconsistent period accounting.

The contract has **not** been independently audited by a third-party security firm. A professional audit is recommended before scaling to significant funds.
