@seedid/core (WIP)

Core primitives for SeedID deterministic generation.

- normalizePassphrase(passphrase): string
- hkdf(ikm, info, salt='seedid/v1', length=32): Promise<Uint8Array>
- deriveMasterKey(passphrase, { algorithm: 'argon2id', params?, salt? }): Promise<Uint8Array>
  - Defaults per spec if not provided: Argon2id, 32-byte output, memory=262144 KiB, time=5, parallelism=2, salt=16 zero bytes
- HKDF labels: LABEL_NOSTR_KEY, LABEL_DID_KEY_ED25519, LABEL_DID_KEY_SECP256K1, LABEL_WALLET_ETH, LABEL_WALLET_BTC, LABEL_WALLET_SOL
- Helpers: forNostr(master), forDidKey(master, curve), forWallet(master, chain)

Build
- TypeScript project. Emits ESM + types.
- Install deps and build:
  - npm install
  - npm run build

Status
- Argon2id via hash-wasm integrated; scrypt intentionally not implemented in core.
- HKDF implemented using Web Crypto HMAC-SHA256.
