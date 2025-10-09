# Tasks: NWC Security & Code Quality Fixes (PR #7 Review)

This task list tracks security fixes and code quality improvements for the NWC connector based on PR #7 review feedback.

## Status Legend
- [x] completed
- [~] in_progress
- [ ] pending

## Critical Security Fixes (Must Fix Before Merge)

- [ ] 1.0 Fix budget race condition
  - [ ] 1.1 Add `reserveBudget(amount)` method that decrements budget BEFORE request
    - Throw ValidationError if amount > remaining budget
    - Store reserved amount for potential refund
  - [ ] 1.2 Add `releaseBudget(amount)` method to refund on failure
    - Increment budget back if payment fails
  - [ ] 1.3 Update `sendRequest()` to use reserve/release pattern
    - Call `reserveBudget()` before `relay.publish()`
    - Call `releaseBudget()` in error handler if request fails
    - Remove budget decrement from success handler (already reserved)
  - [ ] 1.4 Add test for concurrent budget requests
    - Launch 3 concurrent `payInvoice()` calls that would exceed budget
    - Verify only allowed requests succeed
    - Verify budget correctly tracked

- [ ] 2.0 Replace Math.random() with crypto-secure random
  - [ ] 2.1 Import `crypto.randomUUID` from Node.js crypto module
  - [ ] 2.2 Replace request ID generation in `sendRequest()`
    - Current: `Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    - New: `crypto.randomUUID()` (returns RFC 4122 v4 UUID)
  - [ ] 2.3 Add test to verify ID uniqueness
    - Generate 1000 IDs in loop, verify no collisions

- [ ] 3.0 Clear timeout timers to prevent memory leaks
  - [ ] 3.1 Add `clearTimeout(timer)` in success path (after line 141 in nwc.ts)
  - [ ] 3.2 Add `clearTimeout(timer)` in unsubscribe callback
  - [ ] 3.3 Add test for timer cleanup
    - Create 100 requests and verify timers are cleared
    - Check for dangling timer references

- [ ] 4.0 Add type safety for sendRequest params
  - [ ] 4.1 Create `src/nwc-types.ts` with method-specific interfaces:
    - `NwcGetInfoParams` (empty object)
    - `NwcGetInfoResult` (alias, color, pubkey, network, methods, etc.)
    - `NwcPayInvoiceParams` (invoice, amountSats?)
    - `NwcPayInvoiceResult` (preimage, fees_paid?)
    - `NwcMakeInvoiceParams` (amount, description?, expiry?)
    - `NwcMakeInvoiceResult` (invoice, payment_hash)
  - [ ] 4.2 Update `sendRequest<T>()` signature
    - `async sendRequest<T = any>(method: string, params: Record<string, any>, timeoutMs?: number): Promise<T>`
  - [ ] 4.3 Update `getInfo()` to use typed return
    - `async getInfo(): Promise<NwcGetInfoResult>`
  - [ ] 4.4 Update `payInvoice()` to use typed return
    - `async payInvoice(invoice: string, amountSats?: number): Promise<NwcPayInvoiceResult>`
  - [ ] 4.5 Export NWC types from `src/index.ts`

## High-Priority Improvements

- [ ] 5.0 Sanitize error messages from encryption
  - [ ] 5.1 Update `encryptNip44()` catch block
    - Replace: `NIP-44 encryption failed: ${err.message}`
    - With: `NIP-44 encryption failed` (generic message)
    - Add debug log with full error for development
  - [ ] 5.2 Update `decryptNip44()` catch block
    - Replace: `NIP-44 decryption failed: ${err.message}`
    - With: `NIP-44 decryption failed` (generic message)
  - [ ] 5.3 Update `sendRequest()` decryption error handler (line 152-154)
    - Log detailed error to console.debug
    - Don't expose error details to caller

- [ ] 6.0 Add input length limits and validation
  - [ ] 6.1 Define validation constants in `parseNwcUri()`
    - `MAX_RELAY_URL_LENGTH = 2048`
    - `MAX_CAPABILITY_LENGTH = 64`
    - `MAX_CAPABILITIES_COUNT = 32`
    - `ALLOWED_CAPABILITIES = ['get_info', 'pay_invoice', 'make_invoice', 'lookup_invoice']`
  - [ ] 6.2 Validate relay URLs in `parseNwcUri()`
    - Check each relay URL length <= MAX_RELAY_URL_LENGTH
    - Verify wss:// protocol
  - [ ] 6.3 Validate capabilities in `parseNwcUri()`
    - Check capabilities count <= MAX_CAPABILITIES_COUNT
    - Check each capability in ALLOWED_CAPABILITIES set
    - Check each capability length <= MAX_CAPABILITY_LENGTH
  - [ ] 6.4 Add tests for oversized inputs
    - Test relay URL > 2048 chars throws ValidationError
    - Test > 32 capabilities throws ValidationError
    - Test invalid capability name throws ValidationError

- [ ] 7.0 Add error logging and observability
  - [ ] 7.1 Add debug logging in `sendRequest()` message handler catch block
    - `console.debug('NWC: Failed to decrypt message:', e)`
  - [ ] 7.2 Emit error events for silent failures
    - Add `this.emit('error', e)` before swallowing errors
  - [ ] 7.3 Add debug logging for budget operations
    - Log budget reserve/release operations
  - [ ] 7.4 Update README with error event documentation

## Code Quality Enhancements

- [ ] 8.0 Standardize naming conventions
  - [ ] 8.1 Review all occurrences of `clientSecret` vs `senderPrivkey`
    - Keep `clientSecret` in NWC connector (user-facing)
    - Keep `senderPrivkey` in nip44.ts (crypto layer)
    - Add JSDoc clarifying the relationship
  - [ ] 8.2 Review all occurrences of `walletPubkey` vs `recipientPubkey`
    - Keep `walletPubkey` in NWC connector (user-facing)
    - Keep `recipientPubkey` in nip44.ts (crypto layer)
  - [ ] 8.3 Add comments explaining naming convention
    - NWC layer: client/wallet terminology
    - Crypto layer: sender/recipient terminology

- [ ] 9.0 Extract magic numbers to constants
  - [ ] 9.1 Create constants at top of `nwc.ts`
    - `const DEFAULT_REQUEST_TIMEOUT_MS = 2000`
    - `const REQUEST_ID_LENGTH = 36` (UUID length)
  - [ ] 9.2 Replace hardcoded timeout default
    - Update `sendRequest()` signature: `timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS`
  - [ ] 9.3 Document ID format in JSDoc
    - Add comment explaining UUID v4 format

- [ ] 10.0 Complete JSDoc documentation
  - [ ] 10.1 Add JSDoc to `encryptNip44()`
    - Add `@throws {ValidationError}` for invalid inputs
    - Add `@example` showing usage
  - [ ] 10.2 Add JSDoc to `decryptNip44()`
    - Add `@throws {ValidationError}` for invalid inputs or decryption failure
  - [ ] 10.3 Add JSDoc to `sendRequest()`
    - Document timeout behavior
    - Add `@throws {ValidationError}` for not connected, timeout, NWC errors
    - Add `@throws {UnsupportedFeatureError}` for no relay, capability denied
  - [ ] 10.4 Add JSDoc to `getInfo()`
    - Document return fields
    - Add `@example`
  - [ ] 10.5 Add JSDoc to `payInvoice()`
    - Document invoice format requirements
    - Add `@throws` for validation errors, budget exceeded
    - Add `@example`
  - [ ] 10.6 Add JSDoc to private methods
    - `reserveBudget()`, `releaseBudget()`

- [ ] 11.0 Add security-focused tests
  - [ ] 11.1 Add concurrent budget test (already in 1.4)
  - [ ] 11.2 Add fuzzing test for parseNwcUri
    - Test extremely long inputs
    - Test special characters in relay URLs
    - Test malformed URIs
  - [ ] 11.3 Add request ID collision test
    - Generate 10,000 IDs, verify uniqueness
  - [ ] 11.4 Add timeout cleanup test
    - Mock relay that never responds
    - Verify timeout fires and cleans up
  - [ ] 11.5 Add error event emission test
    - Subscribe to 'error' events
    - Trigger decryption failure
    - Verify error event emitted

## Integration & Testing

- [ ] 12.0 Run full test suite and validate
  - [ ] 12.1 Run `npm test` - verify all 35+ tests pass
  - [ ] 12.2 Run `npm run build` - verify no TypeScript errors
  - [ ] 12.3 Review test coverage report
  - [ ] 12.4 Manual testing of typed methods

- [ ] 13.0 Documentation updates
  - [ ] 13.1 Update README with error events
  - [ ] 13.2 Update README with security improvements
  - [ ] 13.3 Add migration notes if any breaking changes

- [ ] 14.0 Commit and push fixes
  - [ ] 14.1 Commit critical fixes (tasks 1-4) separately
  - [ ] 14.2 Commit high-priority improvements (tasks 5-7)
  - [ ] 14.3 Commit code quality enhancements (tasks 8-11)
  - [ ] 14.4 Push to PR #7 branch
  - [ ] 14.5 Request re-review

## Cross-Cutting Concerns

- [ ] C1 Maintain backward compatibility
  - Don't break existing tests
  - Generic `sendRequest()` still works for custom methods
- [ ] C2 Keep bundle size minimal
  - No additional dependencies
  - Tree-shakeable exports
- [ ] C3 Follow existing code style
  - Match MetaMask/Phantom connector patterns
  - Consistent error handling approach

## References
- PR #7: https://github.com/dundas/seedid/pull/7
- PR #7 Review (Claude): https://github.com/dundas/seedid/pull/7#issuecomment-3383673508
- Original task tracker: `tasks/tasks-0009-path-a-nwc-connector.md`
- PRD: `tasks/0010-prd-nwc-security-fixes.md`
