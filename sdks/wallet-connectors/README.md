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

## Quick start

```ts
import { WalletManager } from '@seedid/wallet-connectors'

const wm = new WalletManager()
const wallets = wm.detectWallets() // [{ type: 'metamask', installed: true }, { type: 'phantom', installed: false }, ...]

// MetaMask (EVM)
if (wallets.find(w => w.type === 'metamask' && w.installed)) {
  const mm = await wm.connect('metamask')
  const addr = await mm.getAddress()

  // Sign a message
  const msg = new TextEncoder().encode('hello from seedid')
  const sig = await mm.signMessage(msg)

  // Switch chain (e.g., Mainnet 0x1)
  await (mm as any).switchChain('0x1')

  // Send a transaction (example only)
  const txHash = await (mm as any).sendTransaction({
    from: addr,
    to: addr,
    value: '0x0'
  })
}

// Phantom (Solana)
if (wallets.find(w => w.type === 'phantom' && w.installed)) {
  const ph = await wm.connect('phantom')
  const address = await ph.getAddress()
  const pubkey = await (ph as any).getPublicKey()

  // Sign a message
  const sig = await ph.signMessage(new TextEncoder().encode('hello sol'))

  // Sign multiple transactions (if provider supports it)
  const signedTxs = await (ph as any).signAllTransactions?.([{ /* tx1 */ }, { /* tx2 */ }])
}
```

## Browser notes

- Requires browser wallet providers to be present on `window`:
  - MetaMask: `window.ethereum` (EIP-1193)
  - Phantom: `window.solana`
- In Node/test environments, you can mock these globals (see tests in `__tests__/`).

## Security notes

- **Provider origin checks**:
  - MetaMask connections require `window.ethereum.isMetaMask === true`.
  - Phantom connections require `window.solana.isPhantom === true`.
- **Signature validation**:
  - EVM `personal_sign` signatures must be 65 bytes (`r(32)+s(32)+v(1)`).
  - Phantom `signMessage` signatures must be 64 bytes (Ed25519).
- **Transaction validation (EVM)**:
  - Allowed fields: `from,to,value,data,gas,gasPrice,maxFeePerGas,maxPriorityFeePerGas,nonce,chainId`.
  - Hex fields must be 0x-prefixed hex strings.
  - `from` must match the connected account.
- **Error classes** (exported):
  - `ProviderNotFoundError`, `ProviderMismatchError`, `UserRejectedError`, `ValidationError`, `UnsupportedFeatureError`.

## NWC (Nostr Wallet Connect) quick start

```ts
import { WalletManager, NwcConnector } from '@seedid/wallet-connectors'

// Create connector directly (or via a future detect flow)
const nwc = new NwcConnector()

// Pair using an NWC URI (example)
const pk = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' // 64-hex pubkey
await nwc.connect({ uri: `nostr+walletconnect://${pk}?relay=wss://relay.example.org&cap=get_info&cap=pay_invoice&budget=5000` })

// Provide a relay implementation (see tests for a MockRelay example)
// nwc.setRelay(relay)

// Call a method (requires matching capability)
const info = await nwc.sendRequest('get_info', {})

// Pay an invoice within budget (example shape)
// const res = await nwc.sendRequest('pay_invoice', { amountSats: 1000, invoice: 'lnbc1...' })

await nwc.disconnect()
```

## Development

- Build: `npm run build`
- Test: `npm test`

## Status

Scaffolded with basic interfaces and manager/connectors stubs.
Implementation for MetaMask/Phantom in progress.
