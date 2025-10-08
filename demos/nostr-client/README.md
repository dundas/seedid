# @seedid/nostr-demo

Minimal CLI demo for deriving a Nostr keypair and signing a kind-1 event from a passphrase using `@seedid/core`.

## Install

```sh
npm install
npm run build
```

## Usage

```sh
node dist/index.js --passphrase "<your passphrase>" --content "hello from seedid"
```

Example output:

```json
{
  "pubkey": "...x-only-hex...",
  "id": "...event-id-hex...",
  "sig": "...schnorr-sig-hex...",
  "content": "hello from seedid",
  "created_at": 1700000000
}
```

Notes:
- Uses Argon2id per SeedID spec to derive a master, then HKDF for Nostr root.
- This demo is for development only. Do not use static/low-entropy passphrases in production.
