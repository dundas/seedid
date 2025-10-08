# @seedid/wallet-connectors (scaffold)

Unified wallet connectors for SeedID.

- MetaMask (ETH/EVM) – EIP-1193 provider
- Phantom (SOL) – Solana wallet adapter interface
- (Planned) NWC (Lightning) – NIP-47 client

## Install

```sh
npm install
npm run build
```

## Usage (WIP)

```ts
import { WalletManager } from '@seedid/wallet-connectors'

const wm = new WalletManager()
const wallets = wm.detectWallets()
// choose a wallet and connect
```

## Development

- Build: `npm run build`
- Test: `npm test`

## Status

Scaffolded with basic interfaces and manager/connectors stubs.
Implementation for MetaMask/Phantom in progress.
