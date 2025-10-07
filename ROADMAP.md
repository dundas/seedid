# SeedID Comprehensive Roadmap (Phase-Based)

> Changelog
> - **2025-10-07:** Phase 1 expanded to include Nostr Wallet Connect (NWC) integration and SeedID-derived BTC/Lightning wallets. Dual-path wallet strategy: "Bring Your Own Wallet" (NWC) + "Generate with SeedID" (deterministic derivation). BTC wallet derivation moved from Phase 2 to Phase 1; Phase 2 now focuses on multi-chain expansion (ETH/SOL) and did:key.
> - Unified roadmap: merges integration strategy, wallet derivation, and MVP into one phase-based plan.
> - Replaces prior roadmap sections; clarifies goals, deliverables, exit criteria, and metrics per phase.
> - Adds cross-phase pillars, phase gates/KPIs, and an artifact map for clear handoffs.
> - Priority update: SeedID Core Generation & SDK elevated as top workstream (see tasks-0000) to unblock all phases.

## Phase 0 — Foundations & Core Primitives

**Objective:** Ship the minimal identity + reachability substrate that everything else builds on.

**Workstreams**

* **SeedID Core:** deterministic ID derivation; key hierarchy (master/offline, auth, capability); attestations; append-only audit log with hash-chain + anchoring job.
* **Security Baseline:** WebAuthn/Passkeys first; recovery kit + optional social recovery; token hygiene (short-lived CPTs, nonce/jti).
* **Public API v1:** OIDC provider (auth code + PKCE), capability verify/record/revoke, contacts/reachability CRUD, audit ingest.
* **SDKs (MVP):** Web/TS + iOS/Android basics (login, contacts, capabilities, audit helper).
* **Docs & DX:** Quickstarts, reference, runnable “Hello Messaging” example.

**Deliverables**

* Running OIDC/Capability service + JWKS.
* Web SDK and one mobile SDK with samples.
* Security checklist + threat model v1.
* Developer console (tenant/app, keys, policies, audit viewer).

**Exit Criteria**

* Passkey login works E2E.
* Contacts-only reachability enforced with CPTs.
* Auditable hash-chain for a selected window.
* “Time to first hello world” < 30 minutes.

**Phase Metrics**

* ≥80% passkey enrollment in test cohort.
* p95: auth ≤300ms; capability verify ≤150ms.

---

## Phase 1 — Nostr Beachhead (Identity + Payments)

**Objective:** Land early adoption in a social-first network with zero infra, enabling both identity and payment flows.

**Workstreams**

* **Identity (NIP-06 compatible):**
  * Deterministic Nostr keypair derivation from SeedID.
  * Event signing/publishing, relay management.
  * NIP-05 DNS verification; optional NIP-07 browser extension.
  * Recovery demo (regenerate identity from SeedID inputs).

* **Wallet Integration (Dual-Path):**
  * **Path A: Nostr Wallet Connect (NWC) — "Bring Your Own Wallet"**
    * NWC pairing flow (URI → capabilities/spend limits).
    * Support external Lightning wallets (Alby, Mutiny, etc.) via NWC protocol.
    * Treat NWC as pluggable provider behind unified wallet interface.
  * **Path B: SeedID-Derived Wallet — "Generate with SeedID"**
    * `@seedid/wallets` module with `deriveWallet(chain, index)` API.
    * BTC on-chain (BIP32 secp256k1): P2WPKH (native segwit) or P2TR (taproot).
    * HKDF-namespaced root: `HKDF(master, info="seedid/v1/wallet:btc")`.
    * Lightning adapter: NWC passthrough (now) + SeedID-backed LN signing (later).
    * Non-custodial with optional encrypted backup; recovery via SeedID passphrase.

* **Unified Wallet Interface:**
  * Single "Connect Wallet" UX with tabs: "Pair existing (NWC)" | "Generate with SeedID".
  * Pluggable `WalletProvider` abstraction: `{ type: "nwc" | "seedid-btc", payInvoice(), signPsbt(), broadcast() }`.
  * Zaps/payments module uses `WalletProvider` regardless of source.

* **Security & Capabilities:**
  * Model wallet permissions as capabilities: `wallet:btc.sign`, `wallet:btc.spend[limit=100k sats/day]`, `wallet:ln.pay[limit=5k/day]`.
  * Short-lived tokens, nonce/jti hygiene, revocation in settings.

**Deliverables**

* Nostr reference client with integrated wallet switcher (NWC + SeedID-derived).
* `@seedid/wallets` SDK: BTC derivation (BIP32), PSBT signing, broadcast helpers.
* NWC adapter module for external Lightning wallets.
* Integration guide: "NIP-06 + SeedID recovery" and "Wallets: NWC vs SeedID-generated".
* Demo: Nostr identity + wallet recovered after device loss via SeedID passphrase.

**Exit Criteria**

* Deterministic regeneration of Nostr keys + wallet keys matches across devices.
* Nostr posting + DNS verification works with SeedID keys.
* Zaps work via both NWC-paired wallets and SeedID-derived BTC/LN.
* Recovery flow regenerates identity + wallet from passphrase.

**Phase Metrics**

* 100+ devs trialing SDKs.
* 1,000+ SeedID-derived identities used in the wild.
* 500+ zaps sent via SeedID wallet integration (NWC or native).
* Wallet recovery success rate ≥95% in test cohort.

---

## Phase 2 — Crypto Primitives & Multi-Chain Expansion (did:key + ETH/SOL)

**Objective:** Ship core crypto building blocks for broad interop and expand wallet support beyond Bitcoin.

**Workstreams**

* **did:key Support:**
  * Ed25519 & secp256k1 multicodec/multibase DID Documents.
  * Local resolver and verification helpers.
  * Integration with Nostr identity (NIP-05 → did:key mapping).

* **Multi-Chain Wallet Expansion:**
  * Extend `@seedid/wallets` to support ETH and SOL.
  * ETH: BIP32 secp256k1 (`m/44'/60'/0'/0/i`), Keccak-256 addressing, EIP-55 checksum.
  * SOL: SLIP-0010 Ed25519 (`m/44'/501'/0'/0'/i`), base58 public key addresses.
  * HKDF-namespaced roots: `seedid/v1/wallet:eth`, `seedid/v1/wallet:sol`.
  * Contract wallet templates (ERC-4337 / Safe-style) for ETH (optional).

* **Verifiable Credentials (Optional):**
  * VC signing helper for basic claims (identity attestations, contact cards).

**Deliverables**

* did:key generator + DID doc/resolve library + examples.
* `@seedid/wallets` SDK extended: `deriveWallet("ETH"|"SOL", index)`.
* Multi-chain recovery demo: regenerate BTC/ETH/SOL wallets from passphrase.
* Contract wallet factory templates (ERC-4337) with deployment scripts.

**Exit Criteria**

* did:key resolves locally and in demo verifiers.
* Deterministic wallet derivation matches across devices for BTC/ETH/SOL.
* Contract wallet owner rotation executed with SeedID capability flow (ETH).

**Phase Metrics**

* 100+ devs using crypto SDKs; reproducible vectors confirmed.
* 50+ contract wallets deployed using SeedID-derived keys.

---

## Phase 3 — Social Networks: Bluesky (ATproto) + Mastodon (ActivityPub)

**Objective:** Expand social footprint beyond Nostr with pragmatic bridges.

**Workstreams**

* ATproto: proposal for PLC alternative or did:web mapping; PoC PDS integration using SeedID keys.
* ActivityPub/Mastodon: identity helpers, HTTP signatures; instance mapping; migration notes.

**Deliverables**

* Public proposal + PoC repos; did:web bridge for ATproto (interim).
* ActivityPub helpers and integration guide for Mastodon.

**Exit Criteria**

* Accepted exploration proposal or working bridges with tradeoffs documented.

**Phase Metrics**

* Community engagement (issues, PRs, dev adopters) shows momentum.

---

## Phase 4 — Email + Messaging

**Objective:** Deliver practical communication surfaces to drive daily usage.

**Workstreams**

* Email (SeedMail): SMTP/IMAP gateway design; encryption; spam resistance via capabilities; client plugins.
* Messaging: capability-enforced relay/messaging primitives; E2E encryption; rate limiting & spam prevention; federation.

**Deliverables**

* Email adapters and docs; reference client plugins.
* Messaging primitives and reference relay with federation demo.

**Exit Criteria**

* End-to-end encrypted messaging across federated relays.
* Email adapters validated in pilot clients.

**Phase Metrics**

* 1,000+ active users across pilots; 3+ federated relays.

---

## Phase 5 — Enterprise On-Ramp (OAuth/OIDC Bridge)

**Objective:** Make SeedID “drop-in” for systems that only speak OAuth/OIDC.

**Workstreams**

* **OAuth 2.0 / OIDC Provider (Production Grade):**

  * Auth code + PKCE, device code (optional), client credentials.
  * Token introspection, revocation, robust auditing & rate limits.
  * Policy-backed scopes; capability→access-token exchange (read-only at first).
* **Adapters & Guides:**

  * Reference integrations: NextAuth, Spring Security, Auth0 “as RP”.
  * “Migrate gradually” patterns (coexistence with passwords).
* **Ops & Compliance:**

  * Observability, SLOs, backup/restore drills.
  * DPA posture, privacy documentation.

**Deliverables**

* Hardened OAuth/OIDC service + templates for popular stacks.
* Admin console features: client registration, scopes, logs export.

**Exit Criteria**

* At least one production RP app authenticating via SeedID OAuth.
* Security review passes (3rd-party or internal red team).

**Phase Metrics**

* <0.5% non-malicious token verification failures.
* ≥99.9% availability in canary environments.

---

## Phase 6 — Scale & Ecosystem (SDKs, Contracts, Tooling)

**Objective:** Engage Bluesky/ATproto while keeping pragmatic options open.

**Workstreams**

* **ATproto Track:**

  * Technical assessment + proposal for PLC alternatives (SeedID-backed method) or did:web mapping.
  * PoC PDS integration using SeedID keys; migration path design.
* **Community Standards:**

  * Participate in discussions; publish design notes and test vectors.

**Deliverables**

* Public proposal + PoC repos.
* did:web bridge for ATproto as interim.

**Exit Criteria**

* Acceptance of proposal for exploration or a working did:web bridge with clear tradeoffs documented.

**Phase Metrics**

* Community engagement (issues, PRs, dev adopters) shows momentum.

---

## Phase 7 — Institutional & Federation Options (Selective)

**Objective:** Reduce friction to near-zero; make SeedID the easiest path.

**Workstreams**

* **SDK Matrix Expansion:** TS/JS (polish), Swift/Kotlin (mobile), Rust, Go, Python (server/infra).
* **Smart-Wallet Factory:** ERC-4337 / Safe-style factory; owner rotation & guardians; paymaster patterns.
* **Privacy Enhancements:** App-namespaced derivation paths; ephemeral addresses; per-app reachability scopes.
* **Developer Experience:** CLI, codegen (OpenAPI/TS), mock server, fixtures, test vectors, playground.

**Deliverables**

* Multi-lang SDKs with Stripe-level docs.
* Contract wallet templates + deployment scripts.
* One-click demo deployments (Vercel/Fly/Render).

**Exit Criteria**

* Quickstarts run in < 5 minutes across three languages.
* Contract wallet owner rotation executed with SeedID capability flow.

**Phase Metrics**

* 500+ active developers; tangible OSS contributions.

---

## Phase 8 — Governance, Assurance & Hardening

**Objective:** Address high-demand institutional asks without compromising core simplicity.

**Workstreams (opt-in by demand)**

* **Matrix (OIDC MAS):** OIDC alignment; migration playbook.
* **ActivityPub:** Contribution to identity FEPs; HTTP signatures helpers (low priority).
* **Email Auth Add-on:** DKIM signing with SeedID keys for specific verticals.

**Deliverables**

* Narrow, well-documented adapters where there’s pull.
* Clear tradeoff docs (infra cost vs portability).

**Exit Criteria**

* At least one institutional pilot validates the adapter value.

**Phase Metrics**

* Sustained usage by pilot partners; minimal support burden.

---

## Phase 6 — Governance, Assurance & Hardening

**Objective:** Cement trust with audits, lifecycles, and formal assurances.

**Workstreams**

* **Crypto & Security Audits:** Derivation, CPT flows, contract wallets.
* **Key Lifecycle & Recovery:** Social recovery UX patterns; recovery guardian tooling; rate-limited recovery.
* **Compliance Tracks:** SOC2 Type I→II path; secure SDLC; incident response runbooks.
* **Transparency:** Public security docs; changelogs; deprecation policy.

**Deliverables**

* Published audit reports (or summaries), formal threat model v2.
* Recovery guardian kit + policies.

**Exit Criteria**

* Audit issues remediated; runbooks tested in drills.

**Phase Metrics**

* MTTR on simulated incidents within target; zero critical crypto findings outstanding.

---

## Cross-Phase Pillars (always on)

* **DX & Content:** Blog series, integration guides, comparison articles, videos; goal: <15-minute success path.
* **Community & Partnerships:** Nostr client collabs; wallet vendors; identity vendors (complement to Okta/Auth0).
* **Product Analytics (privacy-preserving):** RED metrics; funnel to “first success” and SDK telemetry devoid of PII.
* **Risk Management:**

  * Key management anxiety → crypto-native first, great education, optional contract wallets/guardians.
  * “Yet another standard” fatigue → emphasize interop (Nostr, did:key, OAuth), not new standards.
  * Platform dependency → diversified targets (Nostr + did:key + OAuth).

---

## Phase Gates (go/no-go) & KPIs

* **Gate after Phase 1:** Did we unlock real usage?
  KPIs: ≥1k SeedID identities; reproducible recovery; Nostr dev adoption; error rate low.
* **Gate after Phase 2:** Are enterprises integrating?
  KPIs: ≥1 production RP; SLOs met; support load acceptable.
* **Gate after Phase 4:** Is DX world-class?
  KPIs: Quickstart <5 minutes in 3 langs; ≥500 active devs; ext. PRs rising.
* **Gate after Phase 6:** Are we trustworthy at scale?
  KPIs: Passing audits; documented recovery; zero Sev-1 crypto issues quarter-over-quarter.

---

## Artifact Map (what to hand to Codex per phase)

* **Specs:** OpenAPI + JSON schemas (identity, capability, wallets, policies, NWC integration).
* **Libraries:** 
  * `@seedid/core` — Master derivation, HKDF namespacing, passphrase normalization.
  * `@seedid/wallets` — Multi-chain wallet derivation (BTC/ETH/SOL), PSBT signing, broadcast helpers.
  * `@seedid/nwc` — Nostr Wallet Connect adapter for external Lightning wallets.
  * `@seedid/oidc` — OAuth/OIDC provider.
  * `@seedid/contracts` — ERC-4337 contract wallet templates.
* **CLIs/Tools:** `seedid init`, `seedid dev`, `seedid wallets derive`, `seedid wallets recover`, `seedid audit verify`.
* **Demos:** 
  * Phase 0: Hello Messaging.
  * Phase 1: Nostr client with wallet switcher (NWC + SeedID-derived BTC/LN), identity + wallet recovery demo.
  * Phase 2: Multi-chain wallet playground (BTC/ETH/SOL), contract wallet deployment.
  * Phase 5: OAuth RP sample (NextAuth, Spring Security).

---

## Summary

Lead with crypto-native simplicity (Nostr + wallets + did:key), unlock enterprise pragmatism (OAuth/OIDC), then widen the ecosystem with standards engagement and tooling—while keeping the SeedID core opinionated, deterministic, and zero-cost to operate. The phase gates keep us honest, the metrics tie back to adoption, and the artifacts give Codex a clear build plan at every step.
- **Documentation:** CC BY 4.0

© 2025 SeedID Project — All Rights Reserved.
