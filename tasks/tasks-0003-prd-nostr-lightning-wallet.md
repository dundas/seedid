## Relevant Files

- `seedid_community/sdks/lightning/package.json` – Lightning SDK package manifest (scripts, metadata, deps).
- `seedid_community/sdks/lightning/tsconfig.json` – TypeScript configuration for ESM build + types.
- `seedid_community/sdks/lightning/README.md` – SDK documentation (NWC, LNURL, Zaps APIs and usage).
- `seedid_community/sdks/lightning/src/nwc.ts` – NIP-47 types, request/response encoding, encryption (NIP-44/NIP-04).
- `seedid_community/sdks/lightning/src/lnurl.ts` – LNURL-pay (LUD-06) helpers: payRequest, callback, description_hash.
- `seedid_community/sdks/lightning/src/zaps.ts` – NIP-57 zap request/receipt event builders and parsers.
- `seedid_community/sdks/lightning/src/crypto.ts` – Encryption helpers for NIP-44 and NIP-04 (reuse from core/nostr-demo if possible).
- `seedid_community/sdks/lightning/__tests__/nwc.test.ts` – Unit tests for NWC message encoding/decoding, encryption.
- `seedid_community/sdks/lightning/__tests__/lnurl.test.ts` – Unit tests for LNURL-pay helpers and description_hash.
- `seedid_community/sdks/lightning/__tests__/zaps.test.ts` – Unit tests for zap request/receipt builders.
- `seedid_community/services/nwc-provider/package.json` – Service package manifest.
- `seedid_community/services/nwc-provider/src/index.ts` – Main entry point, starts Nostr DM loop + HTTP server.
- `seedid_community/services/nwc-provider/src/nwc-handler.ts` – NWC request handler (pay_invoice, make_invoice, get_info).
- `seedid_community/services/nwc-provider/src/server.ts` – HTTP server for LNURL-pay endpoints.
- `seedid_community/services/nwc-provider/src/adapter.ts` – LN backend adapter interface (mock, LND, etc.).
- `seedid_community/services/nwc-provider/src/mock-adapter.ts` – Mock LN backend for testing.
- `seedid_community/services/nwc-provider/README.md` – Service docs: setup, run, pairing flow.

### Notes

- Use Vitest for tests (align with core/wallets).
- Encryption: prefer NIP-44; fallback to NIP-04 if client requests it.
- LNURL-pay endpoints should be standard-compliant (LUD-06).
- Keep LN backend pluggable via adapter interface.
- Service is a demo/reference; not production-ready without rate limiting, auth, etc.

## Tasks

- [ ] 1.0 Scaffold Lightning SDK package
  - [ ] 1.1 Create directory `seedid_community/sdks/lightning/` with subdirs: `src/`, `__tests__/`.
  - [ ] 1.2 Add `package.json` with:
    - `name: "@seedid/lightning"`, `type: "module"`, `main: dist/index.js`, `types: dist/index.d.ts`.
    - Scripts: `build`, `test`, `clean`.
    - Dependencies: `@seedid/core` (for crypto helpers if needed), `@noble/secp256k1`, `@noble/hashes`.
    - Dev deps: `typescript`, `@types/node`, `vitest`.
    - Metadata: `description`, `license: Apache-2.0`, `repository`, `keywords`, `author`.
  - [ ] 1.3 Add `tsconfig.json` matching core/wallets style.
  - [ ] 1.4 Add `README.md` with summary, API overview, install/dev instructions.

- [ ] 2.0 Implement NIP-47 (NWC) SDK primitives in `src/nwc.ts`
  - [ ] 2.1 Define TypeScript types for NWC messages:
    - Request: `{ method: string; params: any }`.
    - Response: `{ result?: any; error?: { code: string; message: string } }`.
    - Info event (kind 13194): `{ methods: string[]; encryption: string[] }`.
  - [ ] 2.2 Implement `encodeNwcRequest(req)` and `decodeNwcResponse(res)` (JSON serialization).
  - [ ] 2.3 Implement encryption wrappers:
    - `encryptNip44(plaintext, sharedSecret)` and `decryptNip44(ciphertext, sharedSecret)`.
    - `encryptNip04(plaintext, sharedSecret)` and `decryptNip04(ciphertext, sharedSecret)` (fallback).
  - [ ] 2.4 Implement `generateConnectionUri(pubkey, relay, secret)` per NIP-47 spec.
  - [ ] 2.5 Implement `parseConnectionUri(uri)` to extract pubkey, relay, secret.
  - [ ] 2.6 Add JSDoc for all exports.

- [ ] 3.0 Implement LNURL-pay (LUD-06) and Zaps (NIP-57) SDK helpers
  - [ ] 3.1 In `src/lnurl.ts`:
    - [ ] 3.1.1 Define `LnurlPayRequest` type (callback, minSendable, maxSendable, metadata, tag).
    - [ ] 3.1.2 Implement `buildPayRequest(params)` to construct LUD-06 JSON.
    - [ ] 3.1.3 Implement `computeDescriptionHash(metadata)` (SHA-256 of metadata string).
    - [ ] 3.1.4 Implement `validateCallbackParams(amount, comment?)` per LUD-06.
  - [ ] 3.2 In `src/zaps.ts`:
    - [ ] 3.2.1 Define types for zap request (kind 9734) and zap receipt (kind 9735).
    - [ ] 3.2.2 Implement `buildZapRequest(recipient, amount, relays, content?)`.
    - [ ] 3.2.3 Implement `buildZapReceipt(zapRequest, bolt11, preimage?)`.
    - [ ] 3.2.4 Implement `parseZapRequest(event)` and `parseZapReceipt(event)`.
  - [ ] 3.3 Add JSDoc for all exports.

- [ ] 4.0 Scaffold NWC provider service/demo
  - [ ] 4.1 Create directory `seedid_community/services/nwc-provider/` with subdirs: `src/`.
  - [ ] 4.2 Add `package.json` with:
    - `name: "@seedid/nwc-provider"`, `type: "module"`, `main: dist/index.js`.
    - Scripts: `build`, `start`, `dev`.
    - Dependencies: `@seedid/lightning`, `@seedid/core`, `nostr-tools` (or similar), `express` (for HTTP server).
    - Dev deps: `typescript`, `@types/node`, `@types/express`.
  - [ ] 4.3 Add `tsconfig.json`.
  - [ ] 4.4 Add `README.md` with setup, run, pairing flow instructions.
  - [ ] 4.5 In `src/adapter.ts`:
    - [ ] 4.5.1 Define `LnBackend` interface: `makeInvoice(amountMsat, memo?)`, `payInvoice(bolt11)`, `getInfo()`.
  - [ ] 4.6 In `src/mock-adapter.ts`:
    - [ ] 4.6.1 Implement mock backend that returns fake BOLT11 invoices and simulates payment success.
  - [ ] 4.7 In `src/index.ts`:
    - [ ] 4.7.1 Generate service keypair and connection URI.
    - [ ] 4.7.2 Connect to Nostr relay, subscribe to DMs (kind 4 or kind 1059 for NIP-44).
    - [ ] 4.7.3 Start HTTP server for LNURL-pay endpoints.

- [ ] 5.0 Implement NWC request handling in service
  - [ ] 5.1 In `src/nwc-handler.ts`:
    - [ ] 5.1.1 Implement `handlePayInvoice(params, backend)` → call `backend.payInvoice(bolt11)`, return result/error.
    - [ ] 5.1.2 Implement `handleMakeInvoice(params, backend)` → call `backend.makeInvoice(amount, memo)`, return bolt11.
    - [ ] 5.1.3 Implement `handleGetInfo(backend)` → return supported methods, balance (if available).
    - [ ] 5.1.4 Implement `handleRequest(req, backend)` dispatcher that routes to above handlers.
  - [ ] 5.2 In `src/index.ts` DM loop:
    - [ ] 5.2.1 Decrypt incoming DM (NIP-44 or NIP-04 based on event tags).
    - [ ] 5.2.2 Parse NWC request, call `handleRequest()`, encrypt response, publish reply DM.
    - [ ] 5.2.3 Publish info event (kind 13194) on startup advertising methods and encryption support.

- [ ] 6.0 Implement LNURL-pay HTTP endpoints in service
  - [ ] 6.1 In `src/server.ts`:
    - [ ] 6.1.1 Serve `GET /.well-known/lnurlp/:username` → return LUD-06 payRequest JSON.
    - [ ] 6.1.2 Serve `GET /lnurl/callback` → validate amount, call `backend.makeInvoice()`, return invoice with description_hash.
    - [ ] 6.1.3 Optionally implement Lightning Address (LUD-16) mapping (user@domain → LNURL-pay).
  - [ ] 6.2 Compute description_hash from payRequest metadata and embed in BOLT11 invoice.

- [ ] 7.0 Wire Zaps flow (NIP-57) in service
  - [ ] 7.1 In `src/index.ts` or separate `zaps-handler.ts`:
    - [ ] 7.1.1 Subscribe to zap request events (kind 9734) on relay.
    - [ ] 7.1.2 Parse zap request, extract amount/recipient, call LNURL-pay callback internally or via HTTP.
    - [ ] 7.1.3 On (mock) payment settle, build and publish zap receipt (kind 9735) with bolt11 and preimage.
  - [ ] 7.2 Ensure description_hash in invoice matches zap request metadata.

- [ ] 8.0 Tests for SDK
  - [ ] 8.1 In `sdks/lightning/__tests__/nwc.test.ts`:
    - [ ] 8.1.1 Test `encodeNwcRequest` and `decodeNwcResponse` round-trip.
    - [ ] 8.1.2 Test NIP-44 encryption/decryption with known vectors.
    - [ ] 8.1.3 Test connection URI generation and parsing.
  - [ ] 8.2 In `sdks/lightning/__tests__/lnurl.test.ts`:
    - [ ] 8.2.1 Test `buildPayRequest` produces valid LUD-06 JSON.
    - [ ] 8.2.2 Test `computeDescriptionHash` matches expected SHA-256.
  - [ ] 8.3 In `sdks/lightning/__tests__/zaps.test.ts`:
    - [ ] 8.3.1 Test `buildZapRequest` and `buildZapReceipt` produce valid events.
    - [ ] 8.3.2 Test `parseZapRequest` and `parseZapReceipt` correctly extract fields.

- [ ] 9.0 Integration test and documentation
  - [ ] 9.1 Create a simple integration test or script that:
    - [ ] 9.1.1 Starts NWC provider with mock backend.
    - [ ] 9.1.2 Pairs a test client using connection URI.
    - [ ] 9.1.3 Calls `make_invoice` and `pay_invoice` via NWC.
    - [ ] 9.1.4 Hits LNURL-pay endpoint and validates response.
  - [ ] 9.2 Update `sdks/lightning/README.md` with API examples and protocol references.
  - [ ] 9.3 Update `services/nwc-provider/README.md` with setup, run, and pairing instructions.
  - [ ] 9.4 Add security notes: mock backend for demo only, rate limiting needed for production, etc.
