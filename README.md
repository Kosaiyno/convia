# Convia — Group Savings Treasury

A decentralized group savings app on Arc where members contribute USDC on a schedule and spending requires approval from a configurable number of members.

Built with [Arc Studio](https://studio.arc.io)

## What It Does

- Groups create a shared USDC treasury with a fixed contribution schedule (weekly, biweekly, or monthly)
- Members contribute USDC directly to the contract — no centralized custody
- Spending proposals require a threshold of member approvals before any funds move
- Full contribution history, member progress, and proposal status are shown onchain

Use cases: group trips, family expenses, team events, community fundraisers.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Onchain: Solidity 0.8.28, OpenZeppelin 5.6.1, Foundry
- Web3: wagmi v2, viem v2, ConnectKit
- Chain: Arc Testnet (Chain ID: 5042002) — native gas is USDC
- Design: Arc Light tokens (Space Grotesk + DM Sans)

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
bun run build   # (if configured)
```

### Test Contracts

```bash
bun run contracts:test    # runs forge test (54 unit tests)
bun run contracts:build   # compile contracts
```

## Deployed Contract

| Network | Address |
|---|---|
| Arc Testnet | `0x4a9ccac88204279200d09686bf5028985f7bed47` |

## Security

The contract passed a balanced security review in Arc Studio. One finding was identified and fixed before deployment: the `requiredApprovals` cap is enforced at `totalMembers - 1` to prevent permanent fund lockup when the proposer cannot self-approve.

This is a testnet demonstration. It has **not** been independently audited by a third party. Do not deploy to mainnet with real funds without a professional security audit.
