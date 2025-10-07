# SeedID Comprehensive Roadmap (Phase-Based)

> Changelog
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

## Phase 1 — Nostr Beachhead

**Objective:** Land early adoption in a social-first network with zero infra.

**Workstreams**

* NIP-06 compatible derivation from SeedID.
* Event signing/publishing, relay management.
* NIP-05 DNS verification; optional NIP-07 browser extension.
* Recovery demo (regenerate identity from SeedID inputs).

**Deliverables**

* Nostr reference client & integration guide.
* Demo: Nostr identity recovered after key loss via SeedID.

**Exit Criteria**

* Deterministic regeneration matches across devices.
* Nostr posting + DNS verification works with SeedID keys.

**Phase Metrics**

* 100+ devs trialing SDKs.
* 1,000+ SeedID-derived identities used in the wild.

---

## Phase 2 — Crypto Primitives & Wallets (did:key + Wallet Derivation)

**Objective:** Ship core crypto building blocks for broad interop.

**Workstreams**

* did:key (Ed25519 & secp256k1), multicodec/multibase DID Documents, local resolver.
* Wallet derivation: HKDF-namespaced root; ETH/BTC/SOL using BIP32/SLIP-10.
* Optional VC signing helper for basic claims.

**Deliverables**

* did:key generator + DID doc/resolve library + examples.
* `@seedid/wallets` SDK with `deriveWallet(chain, index)`.

**Exit Criteria**

* did:key resolves locally and in demo verifiers.
* Deterministic wallet derivation matches across devices for ETH/BTC/SOL.

**Phase Metrics**

* 100+ devs using crypto SDKs; reproducible vectors confirmed.

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

* **Specs:** OpenAPI + JSON schemas (identity, capability, wallets, policies).
* **Libraries:** `@seedid/core`, `@seedid/oidc`, `@seedid/wallets`, `@seedid/contracts`.
* **CLIs/Tools:** `seedid init`, `seedid dev`, `seedid wallets derive`, `seedid audit verify`.
* **Demos:** Hello Messaging (Phase 0), Nostr client + browser extension (Phase 1), OAuth RP sample (Phase 2), Contract wallet playground (Phase 4).

---

## Summary

Lead with crypto-native simplicity (Nostr + wallets + did:key), unlock enterprise pragmatism (OAuth/OIDC), then widen the ecosystem with standards engagement and tooling—while keeping the SeedID core opinionated, deterministic, and zero-cost to operate. The phase gates keep us honest, the metrics tie back to adoption, and the artifacts give Codex a clear build plan at every step.
- **Documentation:** CC BY 4.0

© 2025 SeedID Project — All Rights Reserved.
