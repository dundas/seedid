# PRD: Fix @seedid/core SDK PR Review Issues

## Introduction/Overview

This PRD addresses critical security concerns, bugs, and improvements identified in the code reviews for PR #3 (@seedid/core SDK implementation). The reviews identified several high-priority security issues (zero-salt default, unsafe type casting), code quality issues (deprecated methods, missing validation), and opportunities for improvement (documentation, test coverage).

The goal is to systematically address all critical and high-priority issues before merging the PR, ensuring the SDK meets security best practices and production-readiness standards.

## Goals

1. **Resolve critical security vulnerabilities** (zero-salt default, unsafe type casting)
2. **Fix code quality issues** (deprecated `substr()`, missing input validation)
3. **Improve test coverage** (Argon2id end-to-end tests, edge cases, error paths)
4. **Enhance documentation** (security warnings, JSDoc comments, build instructions)
5. **Add runtime safety checks** (HKDF max length validation, parameter validation)
6. **Improve package metadata** (license, repository, keywords)

## User Stories

- **As a security-conscious developer**, I want clear warnings about the zero-salt default so I understand the security trade-offs and can implement proper salting in production.
- **As a package consumer**, I want proper JSDoc documentation on all exported functions so I can understand how to use the SDK correctly without reading source code.
- **As a maintainer**, I want comprehensive test coverage including edge cases and error paths so I can confidently make changes without breaking functionality.
- **As a developer integrating the SDK**, I want proper input validation with clear error messages so I can quickly identify and fix integration issues.

## Functional Requirements

### Critical Security Fixes

1. **FR-1.1**: Add prominent security warnings in README.md about zero-salt deterministic generation trade-offs
2. **FR-1.2**: Add JSDoc security warnings to `deriveMasterKey()` function about salt usage
3. **FR-1.3**: Replace unsafe `as unknown as Uint8Array` type casts with runtime validation (sdks/core/src/index.ts:64, 107)
4. **FR-1.4**: Add HKDF maximum output length validation (must be ≤ 8160 bytes for SHA-256)

### Code Quality Fixes

5. **FR-2.1**: Replace deprecated `substr()` with `substring()` in core.test.ts:11
6. **FR-2.2**: Add input validation for `deriveMasterKey()`:
   - Reject empty passphrases
   - Reject zero or negative KDF parameters (m, t, p, L)
7. **FR-2.3**: Add input validation for helper functions (forNostr, forDidKey, etc.):
   - Validate master key is exactly 32 bytes
8. **FR-2.4**: Improve error handling in Web Crypto detection (index.ts:14-24) to log specific errors

### Test Coverage Improvements

9. **FR-3.1**: Add Argon2id end-to-end test with known test vectors
10. **FR-3.2**: Add edge case tests:
    - Empty passphrase handling
    - Very long passphrases (>1KB)
    - Master key with incorrect length
    - HKDF with length=0 or length > MAX_LEN
    - Invalid algorithm string
11. **FR-3.3**: Add error path tests for all validation logic

### Documentation Improvements

12. **FR-4.1**: Add comprehensive JSDoc comments to all exported functions:
    - Function purpose and algorithm
    - Parameter descriptions with constraints
    - Return value description
    - Security considerations
    - Usage examples
13. **FR-4.2**: Add build instructions to README.md:
    - Installation instructions
    - Development setup
    - Build and test commands
14. **FR-4.3**: Update README with security best practices section

### Package Metadata

15. **FR-5.1**: Add missing package.json fields:
    - `description`
    - `license` (Apache-2.0)
    - `repository` with directory
    - `keywords`
    - `author`

## Non-Goals (Out of Scope)

1. **Changing the zero-salt design decision** - This is an architectural choice; we'll document it properly but not change it
2. **Removing scrypt references from fixtures** - These may be used by other implementations
3. **Optimizing TextEncoder usage** - Performance optimization is not critical for this PR
4. **Changing TypeScript module resolution strategy** - This can be addressed in a future PR
5. **Adding user-scoped salt generation** - This is the caller's responsibility; we'll document it

## Technical Considerations

### Dependencies
- No new dependencies required
- Uses existing: `hash-wasm`, TypeScript

### Affected Files
- `sdks/core/src/index.ts` - Main implementation
- `sdks/core/src/core.test.ts` - Test suite
- `sdks/core/README.md` - Documentation
- `sdks/core/package.json` - Package metadata

### Compatibility
- All changes must maintain backward compatibility with existing API
- No breaking changes to function signatures
- Added validation should provide clear error messages for migration

## Success Metrics

1. **All critical security issues resolved** - Zero blockers from security review
2. **Test coverage ≥ 90%** - Including edge cases and error paths
3. **All deprecated code removed** - No deprecation warnings
4. **Documentation completeness** - All exported functions have JSDoc, README has security section
5. **PR approval** - Reviews approve changes as production-ready

## Open Questions

1. Should we add runtime warnings when zero salt is detected? (e.g., console.warn in development)
2. What should be the minimum passphrase length requirement? Current spec says ≥90 bits entropy but no length validation
3. Should we add a separate `deriveMasterKeyUnsafe()` function that explicitly documents zero-salt usage?
4. Do we want to add entropy estimation for passphrases and warn if below 90 bits?

## Priority Order

### Phase 1: Critical Fixes (Must complete before merge)
- FR-1.1, FR-1.2, FR-1.3, FR-1.4 (Security)
- FR-2.1 (Deprecated code)
- FR-3.1 (Argon2id test)

### Phase 2: High Priority (Should complete before merge)
- FR-2.2, FR-2.3 (Input validation)
- FR-4.1, FR-4.2, FR-4.3 (Documentation)
- FR-5.1 (Package metadata)

### Phase 3: Nice to Have (Can be follow-up PR)
- FR-2.4 (Improved error handling)
- FR-3.2, FR-3.3 (Additional tests)
