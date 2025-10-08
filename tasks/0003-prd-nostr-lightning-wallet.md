# PRD: Nostr Lightning Wallet Support (NWC + Zaps)

## Summary
Deliver Lightning support for Nostr via two complementary paths:
- Nostr Wallet Connect (NWC, NIP‑47) to let apps control a Lightning wallet over Nostr DMs (E2E‑encrypted).
- Zaps (NIP‑57) backed by LNURL‑pay (LUD‑06) and optionally Lightning Address (LUD‑16) for receiving tips.

This PRD defines the minimal viable capabilities and interfaces for a SeedID community reference implementation. It focuses on protocol correctness, pluggable LN backends, and clean separation between SDK and service/demo.

## Goals
- Provide an SDK for constructing/parsing NIP‑47 requests/responses and handling encryption (NIP‑44 preferred, NIP‑04 fallback).
- Provide a minimal NWC provider service/demo that can:
  - Generate a NWC connection URI for pairing.
  - Handle at least `pay_invoice` and `make_invoice` methods.
  - Advertise supported encryption and capabilities in its info event.
- Provide LNURL‑pay (LUD‑06) endpoints and (optional) Lightning Address (LUD‑16) support for receiving zaps.
- Emit/consume NIP‑57 zap request/receipt events wired to LNURL payments via description_hash.
- Keep LN backend pluggable (LND, Core Lightning, Alby Hub, LNBits, etc.).

## Non‑Goals (v0)
- Running a production LN node.
- On‑chain BTC or multi‑sig.
- UI work beyond minimal demo/CLI for pairing and testing.

## Interfaces

### NWC (NIP‑47)
- Connection URI format per spec (nostr+walletconnect://...).
- Encryption: NIP‑44 preferred; fallback to NIP‑04 if needed. Info event declares supported scheme.
- Minimal methods:
  - `pay_invoice` (string bolt11) → result/err
  - `make_invoice` (amount_msat, memo?) → bolt11
  - `get_info` (optional) → features/balance summary
- Error schema per spec (e.g., `UNSUPPORTED_ENCRYPTION`).

### LNURL‑pay (LUD‑06)
- /.well‑known or endpoint of our service returning payRequest JSON (min/max sats, metadata, callback URL).
- Callback issues BOLT11 invoice containing `description_hash` that hashes metadata from payRequest.
- Optionally publish Lightning Address (LUD‑16) user@domain that maps to LNURL‑pay.

### Zaps (NIP‑57)
- Event kinds 9734 (zap request) and 9735 (zap receipt).
- Tie LN invoice to zap metadata via description_hash.
- Emit zap receipt once payment settles (or mocked in demo mode).

## Architecture
- SDK package (`sdks/lightning/`):
  - NWC message types, encoding/decoding, envelope encryption (NIP‑44/04), helpers.
  - LNURL helpers (payRequest, callback signing/validation, description_hash compute).
- Service/demo (`services/nwc-provider/`):
  - Generates connection URI, runs Nostr DM loop (NWC), exposes LNURL‑pay endpoints, optional LUD‑16.
  - Backend adapter interface for generating/settling invoices (plug different LN providers).

## Acceptance Criteria
- Pairing works: client can connect using NWC URI and call `make_invoice` and `pay_invoice` (demo backend may mock settle).
- LNURL‑pay endpoints validate and produce standard JSON; callback produces BOLT11 with description_hash.
- Zap flow: create zap request → invoice → receipt event upon (mock) payment.
- Clear README with run instructions and protocol references.

## Risks / Considerations
- Encryption interop (NIP‑44 vs NIP‑04) must be explicit in info event.
- LN backend diversity; abstracted via adapter to avoid lock‑in.
- Rate limiting / abuse considerations for public endpoints.

## References
- NIP‑47 (Nostr Wallet Connect): https://nips.nostr.com/47
- NIP‑57 (Lightning Zaps): https://nips.nostr.com/57
- LUD‑06 (LNURL‑pay): https://github.com/lnurl/luds/blob/luds/06.md
- LUD‑16 (Lightning Address): https://github.com/lnurl/luds
