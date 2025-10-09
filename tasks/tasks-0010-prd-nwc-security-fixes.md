# Tasks: NWC Security & Code Quality Fixes (PR #7 Review)

This task list tracks security fixes and code quality improvements for the NWC connector based on PR #7 review feedback.

## Status Legend
- [x] completed
- [~] in_progress
- [ ] pending

## Critical Security Fixes (Must Fix Before Merge)

- [x] 1.0 Fix budget race condition ✅ COMPLETED
  - [x] 1.1 Add `reserveBudget(amount)` method that decrements budget BEFORE request
    - Throw ValidationError if amount > remaining budget
    - Store reserved amount for potential refund
  - [x] 1.2 Add `releaseBudget(amount)` method to refund on failure
    - Increment budget back if payment fails
  - [x] 1.3 Update `sendRequest()` to use reserve/release pattern
    - Call `reserveBudget()` before `relay.publish()`
    - Call `releaseBudget()` in error handler if request fails
    - Remove budget decrement from success handler (already reserved)
  - [x] 1.4 Add test for concurrent budget requests
    - Launch 3 concurrent `payInvoice()` calls that would exceed budget
    - Verify only allowed requests succeed
    - Verify budget correctly tracked

- [x] 2.0 Replace Math.random() with crypto-secure random ✅ COMPLETED
  - [x] 2.1 Import `crypto.randomUUID` from Node.js crypto module
  - [x] 2.2 Replace request ID generation in `sendRequest()`
    - Old: `Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    - New: `crypto.randomUUID()` (returns RFC 4122 v4 UUID)
  - [x] 2.3 Add test to verify ID uniqueness
    - Generate 50 concurrent requests, verify no ID collisions

- [x] 3.0 Clear timeout timers to prevent memory leaks ✅ COMPLETED
  - [x] 3.1 Add `clearTimeout(timer)` in success/error response path
  - [x] 3.2 Declare timer variable before callback for proper closure
  - [x] 3.3 Test verified - no memory leaks with concurrent requests

- [x] 4.0 Add type safety for sendRequest params ✅ COMPLETED
  - [x] 4.1 Create `src/nwc-types.ts` with method-specific interfaces:
    - `NwcGetInfoParams` (empty object)
    - `NwcGetInfoResult` (alias, color, pubkey, network, methods, etc.)
    - `NwcPayInvoiceParams` (invoice, amountSats?)
    - `NwcPayInvoiceResult` (preimage, fees_paid?)
    - `NwcMakeInvoiceParams` (amount, description?, expiry?)
    - `NwcMakeInvoiceResult` (invoice, payment_hash)
  - [x] 4.2 Update `sendRequest<T>()` signature
    - `async sendRequest<T = any>(method: string, params: Record<string, any>, timeoutMs?: number): Promise<T>`
  - [x] 4.3 Update `getInfo()` to use typed return
    - `async getInfo(): Promise<NwcGetInfoResult>`
  - [x] 4.4 Update `payInvoice()` to use typed return
    - `async payInvoice(invoice: string, amountSats?: number): Promise<NwcPayInvoiceResult>`
  - [x] 4.5 Export NWC types from `src/index.ts`

## High-Priority Improvements

- [x] 5.0 Sanitize error messages from encryption ✅ COMPLETED
  - [x] 5.1 Update `encryptNip44()` catch block
    - Replaced with generic `NIP-44 encryption failed` message
    - Added debug log with full error for development (NODE_ENV check)
  - [x] 5.2 Update `decryptNip44()` catch block
    - Replaced with generic `NIP-44 decryption failed` message
    - Added debug log with full error for development
  - [x] 5.3 Update `sendRequest()` decryption error handler
    - Added console.debug logging for malformed messages
    - Error details not exposed to caller

- [x] 6.0 Add input length limits and validation ✅ COMPLETED
  - [x] 6.1 Define validation constants in `parseNwcUri()`
    - `MAX_RELAY_URL_LENGTH = 2048`
    - `MAX_CAPABILITY_LENGTH = 64`
    - `MAX_CAPABILITIES_COUNT = 32`
    - `ALLOWED_CAPABILITIES = ['get_info', 'pay_invoice', 'make_invoice', 'lookup_invoice', 'list_transactions', 'get_balance']`
  - [x] 6.2 Validate relay URLs in `parseNwcUri()`
    - Check each relay URL length <= MAX_RELAY_URL_LENGTH
    - Verify wss:// protocol (already done)
  - [x] 6.3 Validate capabilities in `parseNwcUri()`
    - Check capabilities count <= MAX_CAPABILITIES_COUNT
    - Check each capability in ALLOWED_CAPABILITIES set
    - Check each capability length <= MAX_CAPABILITY_LENGTH
  - [x] 6.4 Add tests for oversized inputs
    - Test relay URL > 2048 chars throws ValidationError
    - Test > 32 capabilities throws ValidationError
    - Test invalid capability name throws ValidationError

- [~] 7.0 Add error logging and observability (PARTIAL - debug logging added in 5.0)
  - [x] 7.1 Add debug logging in `sendRequest()` message handler catch block
    - Added `console.debug('NWC: Failed to decrypt/parse message:', e)`
  - [ ] 7.2 Emit error events for silent failures (skipped for now)
  - [ ] 7.3 Add debug logging for budget operations (skipped for now)
  - [ ] 7.4 Update README with error event documentation (skipped for now)

## Code Quality Enhancements

- [x] 8.0 Standardize naming conventions ✅ COMPLETED
  - [x] 8.1 Review all occurrences of `clientSecret` vs `senderPrivkey`
    - Kept `clientSecret` in NWC connector (user-facing)
    - Kept `senderPrivkey` in nip44.ts (crypto layer)
    - Added module-level JSDoc clarifying the relationship
  - [x] 8.2 Review all occurrences of `walletPubkey` vs `recipientPubkey`
    - Kept `walletPubkey` in NWC connector (user-facing)
    - Kept `recipientPubkey` in nip44.ts (crypto layer)
  - [x] 8.3 Add comments explaining naming convention
    - NWC layer: client/wallet terminology (added to nwc.ts)
    - Crypto layer: sender/recipient terminology (added to nip44.ts)
    - Documented mapping between layers

- [x] 9.0 Extract magic numbers to constants ✅ COMPLETED
  - [x] 9.1 Create constants at top of `nwc.ts`
    - `const DEFAULT_REQUEST_TIMEOUT_MS = 2000`
    - `const REQUEST_ID_LENGTH = 36` (UUID v4 length)
  - [x] 9.2 Replace hardcoded timeout default
    - Updated `sendRequest()` signature: `timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS`
  - [x] 9.3 Document ID format in JSDoc
    - Added comment explaining UUID v4 format (RFC 4122)

- [x] 10.0 Complete JSDoc documentation ✅ COMPLETED
  - [x] 10.1 Add JSDoc to `encryptNip44()`
    - Added `@throws {ValidationError}` for invalid inputs/encryption failures
    - Added `@example` with sample usage
    - Documented ECDH + HKDF + ChaCha20 + HMAC flow
  - [x] 10.2 Add JSDoc to `decryptNip44()`
    - Added `@throws {ValidationError}` for invalid inputs or decryption failure
    - Added `@example` with sample usage
    - Documented HMAC verification
  - [x] 10.3 Add JSDoc to `sendRequest()`
    - Documented timeout behavior (default 2000ms)
    - Added `@throws {ValidationError}` for not connected, timeout, NWC errors
    - Added `@throws {UnsupportedFeatureError}` for no relay, capability denied
    - Added `@template` for generic type parameter
    - Added `@example` showing typed and untyped usage
  - [x] 10.4 Add JSDoc to `getInfo()`
    - Documented return fields (alias, methods, network, etc.)
    - Added `@example` showing response usage
    - Added `@throws` annotations
  - [x] 10.5 Add JSDoc to `payInvoice()`
    - Documented invoice format requirements (BOLT11, starts with "ln")
    - Added `@throws` for validation errors, budget exceeded
    - Added `@example` showing standard and zero-amount invoices
    - Documented atomic budget reservation
  - [x] 10.6 JSDoc for private methods (already had good JSDoc)
    - `reserveBudget()` and `releaseBudget()` already documented

- [x] 11.0 Add security-focused tests ✅ COMPLETED
  - [x] 11.1 Add concurrent budget test (completed in 1.4)
  - [x] 11.2 Add fuzzing test for parseNwcUri
    - Test extremely long wallet pubkeys (10,000 chars)
    - Test special characters in relay URLs (null bytes, injections)
    - Test malformed URI schemes (http://, single/no slashes)
    - Test missing required components
    - Test invalid hex characters in secret
    - Test non-wss relay URLs
    - Test edge case budget values
  - [x] 11.3 Add request ID collision test
    - Generate 1,000 UUIDs and verify uniqueness
    - Validate RFC 4122 v4 format compliance
    - Verify version and variant fields
  - [x] 11.4 Add input validation edge cases
    - Empty strings and null bytes
    - Duplicate query parameters
    - Extremely long relay lists (100 relays)
  - [~] 11.5 Error event emission test (skipped - not implementing error events)

## Integration & Testing

- [x] 12.0 Run full test suite and validate ✅ COMPLETED
  - [x] 12.1 Run `npm test` - 53/53 tests passing
  - [x] 12.2 Run `npm run build` - no TypeScript errors
  - [x] 12.3 Test coverage comprehensive (40 original + 13 new security tests)
  - [x] 12.4 Typed methods validated (NwcGetInfoResult, NwcPayInvoiceResult)

- [~] 13.0 Documentation updates (PARTIAL)
  - [~] 13.1 Update README with error events (skipped - not implementing error events)
  - [x] 13.2 Security improvements documented in JSDoc
  - [x] 13.3 No breaking changes - all backward compatible

- [x] 14.0 Commit and push fixes ✅ COMPLETED
  - [x] 14.1 Commit critical fixes (tasks 1-4) - commit a57a4bf
  - [x] 14.2 Commit high-priority improvements (tasks 5-7) - commit afe976d
  - [x] 14.3 Commit code quality enhancements (tasks 8-11) - commit 23fcb6a
  - [x] 14.4 Push to PR #7 branch - all commits pushed
  - [x] 14.5 Posted detailed PR comments with fixes summary

## Cross-Cutting Concerns

- [x] C1 Maintain backward compatibility ✅
  - All 40 original tests continue passing
  - Generic `sendRequest()` still works for custom methods
  - No breaking changes introduced
- [x] C2 Keep bundle size minimal ✅
  - No additional dependencies added
  - Tree-shakeable exports maintained
  - Only added type definitions and tests
- [x] C3 Follow existing code style ✅
  - Matched MetaMask/Phantom connector patterns
  - Consistent error handling with ValidationError/UnsupportedFeatureError
  - Followed existing test patterns and conventions

## References
- PR #7: https://github.com/dundas/seedid/pull/7
- PR #7 Review (Claude): https://github.com/dundas/seedid/pull/7#issuecomment-3383673508
- Original task tracker: `tasks/tasks-0009-path-a-nwc-connector.md`
- PRD: `tasks/0010-prd-nwc-security-fixes.md`
