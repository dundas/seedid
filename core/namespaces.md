# SeedID Namespaces & HKDF Info Labels (v1)

This document defines stable HKDF `info` labels for domain separation across SeedID key derivations. Labels are ASCII, case‑sensitive, and versioned. Prefix all labels with `seedid/v1/`.

## Label Scheme
- Format: `seedid/v1/<purpose>`
- Rationale: Prevents cross‑protocol key reuse and enables safe evolution via versioning.

## Canonical Labels
- `seedid/v1/nostr:key` — Derive Nostr secp256k1 key (NIP‑06 compatible).
- `seedid/v1/did:key:ed25519` — Derive Ed25519 key for did:key documents.
- `seedid/v1/did:key:secp256k1` — Derive secp256k1 key for did:key documents.
- `seedid/v1/wallet:eth` — Root for Ethereum BIP‑32 path derivation.
- `seedid/v1/wallet:btc` — Root for Bitcoin BIP‑32/84 path derivation.
- `seedid/v1/wallet:sol` — Root for Solana SLIP‑0010 Ed25519 key derivation.

## Usage Example
- HKDF call: `HKDF(salt = context_salt, info = "seedid/v1/nostr:key", ikm = master_seed)`
- Then apply protocol‑specific path/format (e.g., BIP‑32 hardened path for wallets).

## Notes
- Do not reuse labels across purposes; introduce a new `seedid/vN/...` label when semantics change.
- For app‑scoped keys, append an app namespace: `seedid/v1/wallet:eth/app:<app-id>` (optional extension, not required for Phase 1).

## Wallet Derivation Paths (Canonical)
All wallet derivations first obtain chain‑scoped root material via HKDF with the corresponding label, then apply the path below using BIP‑32/BIP‑44 (or SLIP‑0010 for Ed25519).

- Ethereum (secp256k1)
  - HKDF info: `seedid/v1/wallet:eth`
  - Path: `m/44'/60'/0'/0/i` (SLIP‑44 coin type 60)
  - Address: Keccak‑256(pubkey)[12..] with EIP‑55 checksum

- Bitcoin P2WPKH (BIP84, secp256k1)
  - HKDF info: `seedid/v1/wallet:btc`
  - Path: `m/84'/0'/0'/0/i` (mainnet; use coin type 1' for testnet)
  - Address: bech32 (bc1...) from witness program

- Solana (SLIP‑0010 Ed25519)
  - HKDF info: `seedid/v1/wallet:sol`
  - Path: `m/44'/501'/0'/0'/i`
  - Address: base58 of Ed25519 public key

Notes on hardening
- Hardened: indexes with `'` (44', coin type', account') are hardened per BIP‑32.
- Non‑hardened: change (0) and address index (i) are non‑hardened for ETH/BTC; SOL commonly uses hardened change as shown.

## Curves & Key Formats
- Nostr: secp256k1 private key; libraries may sign with Schnorr (BIP‑340). Public keys are 32‑byte x‑coordinate; encodings like `npub`/`nsec` are handled by client libs.
- did:key:
  - Ed25519: multicodec+multibase key identifiers; DID Documents include `verificationMethod` and `authentication` with Ed25519 public key material.
  - secp256k1: multicodec+multibase for secp256k1 public keys; same DID Doc fields as above.
- Wallets:
  - Ethereum/BTC: secp256k1; Ethereum uses ECDSA signatures (Keccak‑derived addresses); Bitcoin uses ECDSA with P2WPKH (BIP84) addresses.
  - Solana: Ed25519 with base58 public key addresses.

## Hardened Derivation Policy
- Use hardened indices for purpose (44'), coin type, and account to prevent parent/child leakage across exported xpubs.
- For ETH/BTC, derive non‑hardened change and address indices to enable watch‑only xpubs when desired.
- For SOL (SLIP‑0010), follow the fully hardened path listed to avoid mixed‑mode derivation pitfalls.
- Never reuse child material across protocols; each protocol starts from its own HKDF label.

## Domain Separation Rules
- Always include a versioned HKDF `info` label (`seedid/vN/...`). Changing semantics requires bumping `vN`.
- Labels are immutable once published; new uses must define new labels rather than repurposing existing ones.
- For app‑scoped derivations, append `app:<app-id>` (or similar stable namespace) to the canonical label to avoid cross‑app correlation.
- Do not strip or alter labels during intermediate storage; the label must be part of the derivation input every time.
