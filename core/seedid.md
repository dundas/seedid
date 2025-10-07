# SeedID Core Spec (v1)

This document locks SeedID’s deterministic generation, parameters, and HKDF namespacing for cross‑language parity.

## Passphrase Normalization
- Normalize with Unicode NFKD, then lowercase, then trim ASCII whitespace.
- Require ≥90 bits entropy (≈7 Diceware words). Show warnings below this.
- Optional pepper may be appended (separately stored); keep out of vectors.

## KDF Parameters (Argon2id)
- Algorithm: Argon2id
- Output length: 32 bytes
- Memory: 256 MiB (memory_cost = 262144 KiB)
- Time cost: 5 iterations
- Parallelism: 2
- Salt: deterministic context (see below). For pure determinism across contexts, use 16 zero bytes; for per‑user determinism, set salt = SHA256("seedid/v1:user:" + user_id)[:16].
- Fallback: scrypt may be used only for local testing.

Resulting 32‑byte output is the SeedID master key.

## HKDF (SHA‑256)
- Extract salt: `seedid/v1` (bytes)
- Expand length: 32 bytes
- Info labels: versioned, ASCII, canonicalized as `seedid/v1/<purpose>`.
- Do not repurpose labels; bump to `vN` on semantic changes.

Canonical labels (see namespaces.md):
- `seedid/v1/nostr:key`
- `seedid/v1/did:key:ed25519`
- `seedid/v1/did:key:secp256k1`
- `seedid/v1/wallet:eth`
- `seedid/v1/wallet:btc`
- `seedid/v1/wallet:sol`

## Pseudocode
```
passphrase' = trim(lowercase(NFKD(passphrase)))
master = Argon2id(passphrase', salt=ctx_salt, m=262144 KiB, t=5, p=2, out=32)
root   = HKDF-Expand(HKDF-Extract(salt="seedid/v1", ikm=master), info=label, L=32)
```
`ctx_salt` is `\x00*16` (pure determinism) or user‑scoped as above.

## Notes
- Never reuse child material across protocols; each protocol starts from its own HKDF label.
- Record KDF parameters alongside vectors; do not include secrets/pepper.
- For wallet paths and curve policy, see `seedid_community/core/namespaces.md`.
