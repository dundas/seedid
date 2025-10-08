# Tasks: Path A - Wallet Connectors

This task list is structured using the patterns in `ai-dev-tasks/` (PRD → tasks → process). It tracks implementation of wallet connectors (MetaMask/Phantom) and Nostr Wallet Connect (NWC) as described in `seedid_community/ROADMAP.md`.

## Scope
- Scaffold `@seedid/wallet-connectors/` package
- Implement MetaMask (EVM) and Phantom (Solana) connectors
- Provide unified `WalletManager`
- Plan and implement Nostr Wallet Connect (NIP-47) connector
- Tests, docs, and CI

## Status Legend
- [x] completed
- [~] in_progress
- [ ] pending

## Milestones

- [~] M1: Browser Wallet Connectors (MetaMask, Phantom)
  - [x] 1.0 Scaffold package structure
    - [x] 1.1 `package.json`, `tsconfig.json`, `README.md`
    - [x] 1.2 `src/` modules (`types.ts`, `manager.ts`, `metamask.ts`, `phantom.ts`, `index.ts`)
    - [x] 1.3 Basic tests (`__tests__/metamask.test.ts`, `__tests__/phantom.test.ts`, `__tests__/manager.test.ts`)
  - [x] 2.0 MetaMask basic functionality
    - [x] 2.1 `connect()`, `isConnected()`, `getAddress()`
    - [x] 2.2 `signMessage()` (personal_sign) with user-reject handling
    - [x] 2.3 `switchChain(chainId)` (wallet_switchEthereumChain), emit `chainChanged`
    - [x] 2.4 `sendTransaction(tx)` (eth_sendTransaction)
    - [x] 2.5 Validation of inputs (message non-empty; tx shape) and extended tests
    - [x] 2.6 Event listener cleanup on `disconnect()`; tests
    - [x] 2.7 Improve type safety (minimal EIP-1193 provider types)
  - [~] 3.0 Phantom basic functionality
    - [x] 3.1 `connect()`, `isConnected()`, `getAddress()`, `getPublicKey()`
    - [x] 3.2 `signMessage()`
    - [x] 3.3 `signAllTransactions()` helper
    - [x] 3.4 Handle account change events; tests
    - [x] 3.5 Event listener cleanup on `disconnect()`; tests
    - [x] 3.6 Improve type safety (minimal Phantom provider types)
  - [ ] 4.0 Documentation & Examples
    - [ ] 4.1 README quick-start: detect → connect → sign; chain switching example
    - [ ] 4.2 Browser notes and provider detection tips
    - [ ] 4.3 JSDoc for public APIs and events
  <!-- CI not required per project decision -->

- [ ] M2: Nostr Wallet Connect (NWC, NIP-47)
  - [ ] 6.0 NWC Connector scaffold
    - [ ] 6.1 NIP-47 client (request/response, encryption basics)
    - [ ] 6.2 Pairing flow (URI → capabilities/spend limits)
    - [ ] 6.3 Provider interface implementation + tests (mock relay)
  - [ ] 7.0 Security & Limits
    - [ ] 7.1 Capability enforcement and spend limits
    - [ ] 7.2 Session lifecycle (revoke, rotate)
    - [ ] 7.3 README: configuration and risks

## Cross-Cutting
- [x] C1 Improve Type Safety
  - Replace `any` with minimal provider interfaces; narrow types in public methods
- [x] C2 Input Validation
  - `signMessage`: require non-empty Uint8Array
  - `switchChain`: normalize/validate hex chainId
  - `sendTransaction`: basic tx-field validation
- [x] C3 Event Listener Hygiene
  - Track bound handlers; remove on disconnect; test no leaks

## References
- `ai-dev-tasks/README.md`, `generate-tasks.md`, `process-task-list.md`
- `seedid_community/ROADMAP.md` (Wallet Integration Path A)
- EIP-1193 (EVM provider), Phantom provider docs, NIP-47 (Nostr Wallet Connect)
