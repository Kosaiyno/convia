# Convia — Group Savings Treasury

## Mainnet Deployment
- **Network:** Arc Mainnet (chain ID 5042)
- **Factory:** `0x6b92b67755EEae73837d80C09B1F11D263cc8D77`
- **Deployer:** `0x7d477C789ddE25b5bf610A9457c0DFc78F1787Aa`
- **Tx:** `0xae0a8b2708fba521de5dd4c267debaf59ec10e31fdf7c96549d8c2aa51584ede`
- **Explorer:** https://explorer.arc.io/address/0x6b92b67755EEae73837d80C09B1F11D263cc8D77
- **Live app:** https://arc-studio-515b39c396bd44628fef96f2.vercel.app

> Built with Arc Studio — money-powered apps in minutes

## What This App Does

Convia is a group savings treasury on Arc. Members contribute USDC on a fixed schedule (weekly, biweekly, or monthly). Funds are held by the smart contract. Spending requires a multi-sig approval threshold — no single member can withdraw alone.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Arc Light design tokens
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`
- Chain: Arc Testnet (Chain ID: 5042002)
- Token: USDC (6 decimals, address: 0x3600000000000000000000000000000000000000)
- Toasts: Sonner

## Deployed Contracts

| Contract | Network | Address | Explorer |
|---|---|---|---|
| ConviaTreasuryFactory | Arc Testnet | 0xf17e8a27068cc7b90f52e737805e6b93d165b83e | https://explorer.testnet.arc.io/address/0xf17e8a27068cc7b90f52e737805e6b93d165b83e |
| ConviaTreasury (demo) | Arc Testnet | 0x4a9ccac88204279200d09686bf5028985f7bed47 | https://explorer.testnet.arc.io/address/0x4a9ccac88204279200d09686bf5028985f7bed47 |

**Deploy tx:** 0x7533da0d8df187793274b8b362ccb42ad0d727f1c56e487d6b8f77507d4565fe

**Demo treasury params (constructor):**
- name: "Convia Demo Treasury"
- contributionAmount: 10,000,000 (= $10 USDC)
- frequency: 2 (monthly / 30-day periods)
- startTimestamp: 1793016000 (Oct 26, 2026)
- endTimestamp: 1824552000 (Oct 26, 2027)
- initialMembers: [0x5B12Ce46C7194aD57d143bC22847224047b1Ef42, 0x000000000000000000000000000000000000dEaD]
- requiredApprovals: 1

## Key Files

- `src/App.tsx` — Top-level router (view state)
- `src/components/Shell.tsx` — Nav + wrong-network banner
- `src/components/Home.tsx` — Landing page + treasury card
- `src/components/Dashboard.tsx` — Balance, stats, quick nav
- `src/components/Members.tsx` — Member list + contribution summaries
- `src/components/Contribute.tsx` — USDC approve + contribute flow
- `src/components/Proposals.tsx` — Proposal list + approve/execute
- `src/components/CreateProposal.tsx` — New proposal form
- `src/components/History.tsx` — Contribution + withdrawal history
- `src/hooks/useTreasury.ts` — All contract read hooks
- `src/lib/contract.ts` — Contract address + ABI config
- `contracts/ConviaTreasury.sol` — The treasury smart contract

## Security Notes

- Contract passed a balanced security review (no material findings after fix)
- 54/54 Foundry unit tests pass
- The `requiredApprovals` constructor arg is capped at `totalMembers - 1` to prevent permanent fund lockup (proposer cannot self-approve)
- Checks-effects-interactions on executeProposal; ReentrancyGuard on contribute + execute
- No owner/admin with special privileges; no emergency withdrawal
- This is a testnet demo — it has NOT been independently audited by a third party

## To Run

```bash
bun install
bun run dev
```

## Contract Commands

```bash
bun run contracts:build   # forge build
bun run contracts:test    # forge test
```
