# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SeedID** is a deterministic identity system that provides self-sovereign digital identity derived entirely from mathematics. Users can regenerate their entire identity tree from a single memorized passphrase using Argon2id → HKDF → BIP32/SLIP-0010 cryptographic derivation.

This repository contains **community documentation, schemas, and specifications** for SeedID. It is primarily a documentation repository with JSON schemas and markdown specifications—no implementation code exists here yet.

## Repository Structure

```
seedid_community/
├── core/                  # Core specifications
│   ├── seedid.md         # Master spec: KDF parameters, HKDF namespacing
│   └── namespaces.md     # HKDF info labels & wallet derivation paths
├── schemas/              # JSON Schema definitions
│   ├── contact-card-v1.json   # Discovery document for messaging/referrals
│   ├── ref-token-v1.json      # Referral token format
│   └── cap-row-v1.json        # Capability row format
├── docs/
│   └── seedid whitepaper v0.md  # Full theoretical foundation
├── ROADMAP.md           # Phase-based development plan
└── SECURITY.md          # Security policy & disclosure process
```

## Key Architecture Concepts

### Cryptographic Foundation
- **Master Key Derivation**: Argon2id (256 MiB, t=5, p=2) from normalized passphrase
- **Domain Separation**: HKDF with versioned `info` labels (`seedid/v1/<purpose>`)
- **Per-Protocol Isolation**: Each protocol (Nostr, wallets, DIDs) gets unique HKDF namespace
- **Minimum Entropy**: ≥90 bits (7 Diceware words) required for passphrases

### Canonical HKDF Labels (from core/namespaces.md)
- `seedid/v1/nostr:key` — Nostr secp256k1 (NIP-06 compatible)
- `seedid/v1/did:key:ed25519` — Ed25519 for did:key
- `seedid/v1/did:key:secp256k1` — secp256k1 for did:key
- `seedid/v1/wallet:eth` — Ethereum BIP-32 root (m/44'/60'/0'/0/i)
- `seedid/v1/wallet:btc` — Bitcoin BIP-84 root (m/84'/0'/0'/0/i)
- `seedid/v1/wallet:sol` — Solana SLIP-0010 root (m/44'/501'/0'/0'/i)

**Critical Rule**: Never reuse labels across purposes. Labels are immutable once published.

### Passphrase Normalization (from core/seedid.md)
```
1. Unicode NFKD normalization
2. Lowercase
3. Trim ASCII whitespace
```

### Development Phases

The project follows an 8-phase roadmap (ROADMAP.md):
- **Phase 0**: Core primitives (OIDC, capabilities, WebAuthn, SDKs)
- **Phase 1**: Nostr integration (NIP-06 derivation, event signing)
- **Phase 2**: Crypto primitives (did:key, wallet derivation)
- **Phase 3**: Social networks (Bluesky ATproto, Mastodon ActivityPub)
- **Phase 4**: Email + Messaging (SeedMail, capability-based relays)
- **Phase 5**: Enterprise OAuth/OIDC bridge
- **Phase 6**: Scale & ecosystem tooling
- **Phase 7**: Institutional federation options
- **Phase 8**: Governance & security audits

**Current Priority**: Phase 0 foundational work—especially SeedID Core Generation & SDK.

## JSON Schemas

All schemas use JSON Schema Draft 2020-12 and are published under `https://seedid.dev/schemas/`.

### contact-card-v1.json
Discovery document for messaging with fields:
- `did`: Owner's DID (did:web or did:key)
- `knock_url`: Messaging endpoint
- `policy.mode`: `closed`, `referrals-only`, `open`, `open+vc`
- `ref_pub`: Optional referral inbox public key (multibase)

## Security Requirements

### Critical Constraints
- **Entropy**: Always validate ≥90 bits passphrase entropy (7+ Diceware words)
- **KDF Parameters**: Argon2id memory=256 MiB, time=5, parallelism=2
- **Salt Policy**: Use deterministic context salt (16 zero bytes for pure determinism, or SHA256-derived user-scoped salt)
- **No Label Reuse**: HKDF info labels are immutable; bump version for semantic changes

### Security Disclosure
- Report vulnerabilities to security@seedid.dev
- Coordinated disclosure: 72h acknowledgment, 30-day fix target
- See SECURITY.md for full policy

## Cross-Language Parity

When implementing SeedID in any language, ensure:
1. Identical passphrase normalization (NFKD → lowercase → trim)
2. Exact Argon2id parameters (m=262144 KiB, t=5, p=2, out=32)
3. HKDF-Extract with salt=`"seedid/v1"`, HKDF-Expand with canonical labels
4. Hardened derivation for wallets (BIP-32 for secp256k1, SLIP-0010 for Ed25519)

Generate test vectors and validate against reference implementations.

## Documentation Standards

- All specs use markdown with inline code/pseudocode
- Cryptographic operations reference standards (BIP-32, BIP-44, BIP-84, SLIP-0010, NIP-06)
- Parameters are locked once published; document version bumps explicitly
- Include examples with real-world use cases (Nostr, wallets, DIDs)

## License
- **Code**: Apache-2.0
- **Documentation**: CC BY 4.0
