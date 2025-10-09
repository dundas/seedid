# Tasks: Path A - Nostr Wallet Connect (NWC)

This task list tracks M2 work to implement a Nostr Wallet Connect (NIP-47) connector as part of Path A (Bring Your Own Wallet), per `seedid_community/ROADMAP.md`.

## Scope
- Scaffold NWC connector in `@seedid/wallet-connectors/`
- Implement pairing (NWC URI → capabilities/spend limits)
- Implement request/response over Nostr (mock relay in tests)
- Add minimal commands (e.g., get_info, pay_invoice) and surface via unified interface
- Input validation, timeouts, and error handling
- Tests, docs

## Status Legend
- [x] completed
- [~] in_progress
- [ ] pending

## Milestones

- [x] M2: Nostr Wallet Connect (NIP-47)
  - [x] 1.0 Scaffold connector & types
    - [x] 1.1 `src/nwc.ts` provider skeleton (EventEmitter, connect/disconnect, isConnected)
    - [x] 1.2 `NwcRelay`/envelopes minimal types in `src/types.ts`
    - [x] 1.3 Export from `src/index.ts`
  - [x] 2.0 Pairing & Capabilities
    - [x] 2.1 Parse NWC URI (wallet pubkey, relay URLs, client secret, capabilities, budget)
    - [x] 2.2 Establish session state; validate capability requests
    - [x] 2.3 Input validation + error types (ValidationError, UnsupportedFeatureError)
  - [x] 3.0 Transport (Mock Relay for tests)
    - [x] 3.1 Define request/response envelope (id, method, params)
    - [x] 3.2 Implement send/receive over mocked relay interface
    - [x] 3.3 Timeouts, error mapping, and budget tracking
  - [x] 4.0 Crypto Envelope (NIP-44 v2)
    - [x] 4.1 Encrypt/decrypt with NIP-44 v2 (ChaCha20 + HMAC-SHA256, ECDH + HKDF)
    - [x] 4.2 Input/output validation for encryption (hex keys, non-empty payloads)
    - [x] 4.3 Conversation key derivation (client secret + wallet pubkey)
  - [x] 5.0 Minimal Methods
    - [x] 5.1 `getInfo()` typed method
    - [x] 5.2 `payInvoice(invoice, amountSats?)` typed method with validation
    - [x] 5.3 Error mapping to typed errors
  - [x] 6.0 Tests
    - [x] 6.1 Pairing flow happy-path + invalid URIs + secret validation
    - [x] 6.2 Command round-trip via mock relay (success/reject/timeout) with encryption
    - [x] 6.3 Provider lifecycle (disconnect, event cleanup, rapid cycles)
    - [x] 6.4 Typed methods (getInfo, payInvoice) with wallet mocks
    - [x] 6.5 NIP-44 crypto (encrypt/decrypt, bidirectional, JSON, error handling)
  - [x] 7.0 Docs
    - [x] 7.1 README: pairing example with secret parameter, typed methods
    - [x] 7.2 Security notes: NIP-44 encryption, capabilities, budgets

## Cross-Cutting
- [x] C1 Input Validation & Errors
  - ValidationError, UnsupportedFeatureError integrated
- [x] C2 Event Listener Hygiene
  - removeAllListeners() on disconnect
- [x] C3 Type Safety
  - Typed method params/returns; NwcSession interface with walletPubkey + clientSecret

## References
- `seedid_community/ROADMAP.md` (Path A NWC)
- NIP-47 specification (request/response and encryption model)
- Prior connectors (MetaMask, Phantom) for patterns
