@seedid/wallets (v0.2)

Derive deterministic per-chain root material (ETH/BTC/SOL) from a SeedID master key using canonical HKDF labels via `@seedid/core`, and derive actual wallet addresses ready to receive funds.

- deriveWalletRoot(master, chain): Promise<Uint8Array>
- forEthRoot(master), forBtcRoot(master), forSolRoot(master)
- deriveEthAddress(root, index?), deriveBtcAddress(root, index?), deriveSolAddress(root, index?)
- deriveEthSigningKey(root, index?), deriveBtcSigningKey(root, index?), deriveSolSigningKey(root, index?)
- zeroize(buf) utility for clearing sensitive data

Installation
- npm install
- npm run build

Development
- Tests: npm test
- Clean: npm run clean

Usage
- import { deriveWalletRoot, forEthRoot, deriveEthAddress, deriveBtcAddress, deriveSolAddress } from '@seedid/wallets'
- import { deriveMasterKey, normalizePassphrase } from '@seedid/core'
- const pass = normalizePassphrase('Correct Horse Battery Staple')
- const master = await deriveMasterKey(pass, { algorithm: 'argon2id' })
- const ethRoot = await forEthRoot(master)
- const eth = await deriveEthAddress(ethRoot, 0) // { address: 0x..., publicKey }
- const btc = await deriveBtcAddress(await deriveWalletRoot(master, 'btc'), 0) // { address: bc1q..., publicKey }
- const sol = await deriveSolAddress(await deriveWalletRoot(master, 'sol'), 0) // { address: Base58, publicKey }

Notes
- Follow security guidance in `@seedid/core` regarding salts and passphrase entropy.
- ETH derivation follows BIP44 path m/44'/60'/0'/0/{index}. Address is Keccak-256 of uncompressed public key (x||y), EIP-55 checksum applied.
- BTC derivation follows BIP84 path m/84'/0'/0'/0/{index} for native SegWit (P2WPKH). Address is Bech32 (bc1q...). Taproot (P2TR) is not yet supported.
- SOL derivation currently uses a direct Ed25519 keypair from the SOL root (non-standard). We plan a SLIP-10 hardened derivation follow-up. Addresses are Base58 encoded public keys.

Address Derivation APIs
- deriveEthAddress(root: Uint8Array, index = 0): Promise<{ address: string; publicKey: Uint8Array }>
- deriveBtcAddress(root: Uint8Array, index = 0): Promise<{ address: string; publicKey: Uint8Array }>
- deriveSolAddress(root: Uint8Array, index = 0): Promise<{ address: string; publicKey: Uint8Array }>

Signing Keys
- deriveEthSigningKey(root: Uint8Array, index = 0): Promise<{ privateKey: Uint8Array; publicKey: Uint8Array; address: string }>
- deriveBtcSigningKey(...), deriveSolSigningKey(...): same shape.

Security
- Keep private keys in memory only and clear them after use:
  ```ts
  import { deriveEthSigningKey, zeroize } from '@seedid/wallets'
  const key = await deriveEthSigningKey(ethRoot, 0)
  // ...sign transaction...
  zeroize(key.privateKey)
  ```
- Validate inputs: all functions require a 32-byte root and non-negative integer index.
- SOL derivation is non-standard for now; do not expect import/export compatibility with Phantom/Solflare hardware flows yet.
