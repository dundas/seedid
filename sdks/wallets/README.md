@seedid/wallets (v0.1)

Derive deterministic per-chain root material (ETH/BTC/SOL) from a SeedID master key using canonical HKDF labels via `@seedid/core`.

- deriveWalletRoot(master, chain): Promise<Uint8Array>
- forEthRoot(master), forBtcRoot(master), forSolRoot(master)

Installation
- npm install
- npm run build

Development
- Tests: npm test
- Clean: npm run clean

Usage
- import { deriveWalletRoot, forEthRoot } from '@seedid/wallets'
- const master = await deriveMasterKey('pass', { algorithm: 'argon2id' }) // from @seedid/core
- const ethRoot = await forEthRoot(master)

Notes
- This package emits only per-chain root material. Downstream key/address derivation is out-of-scope for v0.1.
- Follow security guidance in `@seedid/core` regarding salts and passphrase entropy.
