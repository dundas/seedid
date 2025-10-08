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

- [~] M2: Nostr Wallet Connect (NIP-47)
  - [x] 1.0 Scaffold connector & types
    - [x] 1.1 `src/nwc.ts` provider skeleton (EventEmitter, connect/disconnect, isConnected)
    - [x] 1.2 `NwcRelay`/envelopes minimal types in `src/types.ts`
    - [x] 1.3 Export from `src/index.ts`
  - [ ] 2.0 Pairing & Capabilities
    - [x] 2.1 Parse NWC URI (pubkey, relay URLs, capabilities, budget)
    - [x] 2.2 Establish session state; validate capability requests
    - [ ] 2.3 Input validation + error types
  - [x] 3.0 Transport (Mock Relay for tests)
    - [x] 3.1 Define request/response envelope (id, method, params)
    - [x] 3.2 Implement send/receive over mocked relay interface
    - [x] 3.3 Timeouts, retries, and idempotency
  - [ ] 4.0 Crypto Envelope (NIP-47 compatible)
    - [ ] 4.1 Encrypt/decrypt payload (keys, nonce, algorithm per NIP-47)
    - [ ] 4.2 Validate signatures; input/output schema validation
    - [ ] 4.3 Zeroization of ephemeral secrets where applicable
  - [ ] 5.0 Minimal Methods
    - [ ] 5.1 `get_info`
    - [ ] 5.2 `pay_invoice`
    - [x] 5.3 Error mapping to typed errors
  - [x] 6.0 Tests
    - [x] 6.1 Pairing flow happy-path + invalid URIs
    - [x] 6.2 Command round-trip via mock relay (success/reject/timeout)
    - [ ] 6.3 Provider lifecycle (disconnect, event cleanup)
  - [ ] 7.0 Docs
    - [ ] 7.1 README: pairing example and minimal commands
    - [ ] 7.2 Security notes: capabilities, budgets, and relay trust

## Cross-Cutting
- [ ] C1 Input Validation & Errors
  - ValidationError, UserRejectedError, UnsupportedFeatureError reuse
- [ ] C2 Event Listener Hygiene
  - Track handlers and remove on disconnect
- [ ] C3 Type Safety
  - Narrow method params/returns; minimal NWC interfaces

## References
- `seedid_community/ROADMAP.md` (Path A NWC)
- NIP-47 specification (request/response and encryption model)
- Prior connectors (MetaMask, Phantom) for patterns
