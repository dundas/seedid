# PRD: NWC Security & Code Quality Fixes (PR #7 Review)

## Summary
Address security vulnerabilities and code quality issues identified in PR #7 review feedback for the Nostr Wallet Connect (NIP-47) implementation. Fixes include critical security issues (budget race conditions, weak random IDs), high-priority improvements (error sanitization, input validation), and code quality enhancements (type safety, documentation).

## Goals
- **Critical Security Fixes**: Eliminate race conditions, use crypto-secure randomness, prevent memory leaks
- **Input Validation**: Add length limits and sanitization for all external inputs
- **Type Safety**: Replace `any` types with proper TypeScript interfaces
- **Error Handling**: Sanitize error messages, add debug logging, improve observability
- **Code Quality**: Standardize naming, extract constants, complete JSDoc documentation
- **Testing**: Add security-focused tests for concurrent requests, fuzzing, timing attacks

## Non-Goals (v0.1)
- Rate limiting implementation (defer to future PR)
- Replay attack prevention beyond unique IDs (defer to future PR)
- Conversation key caching optimization (defer to future PR)
- Production relay integration (mock relay sufficient for now)

## Critical Issues from Review

### 1. Budget Race Condition
**Current**: Budget decremented AFTER payment succeeds, allowing concurrent requests to overspend
**Fix**: Check and reserve budget BEFORE making request using atomic operations
**Impact**: HIGH - Financial security vulnerability

### 2. Weak Random ID Generation
**Current**: Using `Math.random()` for request IDs
**Fix**: Use `crypto.randomUUID()` or `crypto.randomBytes()`
**Impact**: HIGH - Request forgery vulnerability

### 3. Memory Leak - Timeout Timers
**Current**: Timers not cleared in success path
**Fix**: Add `clearTimeout(timer)` after successful responses
**Impact**: MEDIUM - Memory leaks in long-running sessions

### 4. Type Safety - Any Parameters
**Current**: `sendRequest(method: string, params: any): Promise<any>`
**Fix**: Create typed interfaces for NWC method params/results
**Impact**: MEDIUM - Runtime errors, poor developer experience

## High-Priority Improvements

### 5. Error Message Sanitization
**Current**: Raw error messages from nostr-tools exposed to callers
**Fix**: Use generic error messages, log detailed errors privately
**Impact**: LOW - Information disclosure

### 6. Input Length Limits
**Current**: No validation of relay URL or capability string lengths
**Fix**: Add max length constants and validation
**Impact**: MEDIUM - DoS vector, potential injection attacks

### 7. Error Logging
**Current**: Silent error swallowing in message handler
**Fix**: Add debug logging or error events for monitoring
**Impact**: LOW - Debugging difficulty

## Code Quality Enhancements

### 8. Naming Consistency
**Current**: Mixed `clientSecret`/`senderPrivkey`, `walletPubkey`/`recipientPubkey`
**Fix**: Standardize on consistent terminology throughout codebase
**Impact**: LOW - Developer experience, code readability

### 9. Magic Numbers
**Current**: Hardcoded `2000` (timeout), `.slice(2, 8)` (ID length)
**Fix**: Extract to named constants with documentation
**Impact**: LOW - Code maintainability

### 10. JSDoc Documentation
**Current**: Incomplete JSDoc, missing `@throws` annotations
**Fix**: Complete JSDoc for all public APIs with examples
**Impact**: LOW - Developer experience, API clarity

### 11. Security Testing
**Current**: No tests for concurrent requests, fuzzing, timing attacks
**Fix**: Add comprehensive security test suite
**Impact**: MEDIUM - Test coverage gaps for security scenarios

## Architecture

### Type Safety Enhancement
```typescript
// Define explicit NWC method types
export interface NwcGetInfoParams {}
export interface NwcGetInfoResult {
  alias?: string
  color?: string
  pubkey?: string
  network?: string
  methods?: string[]
}

export interface NwcPayInvoiceParams {
  invoice: string
  amountSats?: number
}
export interface NwcPayInvoiceResult {
  preimage: string
  fees_paid?: number
}

// Update sendRequest signature
async sendRequest<T = any>(
  method: string,
  params: Record<string, any>,
  timeoutMs?: number
): Promise<T>
```

### Budget Management
```typescript
// Atomic check-and-reserve pattern
private reserveBudget(amountSats: number): void {
  if (!this.session?.budgetSats) return

  const remaining = this.session.budgetSats
  if (amountSats > remaining) {
    throw new ValidationError(`Amount ${amountSats} exceeds remaining budget ${remaining}`)
  }

  // Reserve immediately (decrement before request)
  this.session.budgetSats = remaining - amountSats
}

private releaseBudget(amountSats: number): void {
  if (!this.session?.budgetSats) return
  // Refund on failure
  this.session.budgetSats += amountSats
}
```

### Input Validation Constants
```typescript
// Add validation limits
const MAX_RELAY_URL_LENGTH = 2048
const MAX_CAPABILITY_LENGTH = 64
const MAX_CAPABILITIES_COUNT = 32
const ALLOWED_CAPABILITIES = new Set([
  'get_info',
  'pay_invoice',
  'make_invoice',
  'lookup_invoice',
  'list_transactions'
])
```

## Success Metrics
- All 35 existing tests continue passing
- New security tests added (concurrent budget, fuzzing inputs)
- Zero `any` types in public API signatures
- 100% JSDoc coverage for public methods
- Code review approval from PR #7 reviewers

## References
- PR #7: https://github.com/dundas/seedid/pull/7
- PR #7 Review Comments (Claude)
- NIP-47 Specification: https://github.com/nostr-protocol/nips/blob/master/47.md
- NIP-44 Specification: https://github.com/nostr-protocol/nips/blob/master/44.md
