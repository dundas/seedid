# PRD: @seedid/wallets SDK v0.1

## Summary
Provide a lightweight Wallets SDK under the SeedID community repo that exposes deterministic chain roots derived from the SeedID Core master key using canonical HKDF labels. Initial chains: ETH, BTC, SOL. This version focuses on producing stable per-chain root material suitable for downstream wallets/libraries. Key and address derivation for specific protocols will be phased in later.

## Goals
- Deterministic, reproducible chain root material for ETH/BTC/SOL using `@seedid/core` HKDF helpers/labels.
- Simple, typed API that can be expanded in later versions to full key/address derivation.
- Tests verifying roots match community fixtures (HKDF roots).
- Clear README and package metadata.

## Non-Goals (v0.1)
- No full BIP32/BIP44 pipelines yet.
- No chain-specific address/tx signing logic.
- No persistence/sync/encryption features.

## Target API (v0.1)
```ts
export type Chain = 'eth' | 'btc' | 'sol';

// Accepts a 32-byte master key from @seedid/core. Returns 32-byte per-chain root material.
export async function deriveWalletRoot(master: Uint8Array, chain: Chain): Promise<Uint8Array>;

// Convenience, if helpful
export async function forEthRoot(master: Uint8Array): Promise<Uint8Array>;
export async function forBtcRoot(master: Uint8Array): Promise<Uint8Array>;
export async function forSolRoot(master: Uint8Array): Promise<Uint8Array>;
```

Later (v0.2+):
```ts
// Not in scope for v0.1
export async function deriveWallet(chain: Chain, index: number /* and path opts */): Promise<{ priv: Uint8Array; pub?: Uint8Array; addr?: string }>;
```

## Technical Details
- Use `@seedid/core` exports and canonical labels:
  - `LABEL_WALLET_ETH`, `LABEL_WALLET_BTC`, `LABEL_WALLET_SOL`, `HKDF_SALT`.
  - Or call `forWallet(master, chain)` directly for v0.1.
- Validate inputs (master must be 32 bytes; chain must be supported).
- Tests should read fixtures co-located inside the package to avoid cross-repo coupling.

## Directory Layout
```
seedid_community/sdks/wallets/
  package.json
  tsconfig.json
  README.md
  src/
    index.ts
  __tests__/
    wallets.test.ts
  fixtures/
    wallet_eth.json
    wallet_btc.json
    wallet_sol.json
```

## Acceptance Criteria
- Build (tsc) succeeds.
- Tests pass (validate that HKDF roots for ETH/BTC/SOL match fixtures).
- README documents API with short examples.
- Package.json includes metadata: description, license Apache-2.0, repository, keywords, author.

## Risks / Considerations
- Later address/key derivation will introduce dependencies on crypto libs (e.g., noble-secp256k1, bitcoinjs, @scure/bip32/hdkey). Keep v0.1 dependency-light.
- Align fixtures and labels with `seedid_community/core/namespaces.md`.
- Consistency across Node/browser (Web Crypto availability already handled by core).

## Milestones
- v0.1: Chain roots API, tests, docs (this PRD)
- v0.2: ETH derivation to address (EIP-55) + signing helpers
- v0.3: BTC BIP32/BIP84 roots to P2WPKH (and/or P2TR) preview
- v0.4: SOL ed25519 key export preview
