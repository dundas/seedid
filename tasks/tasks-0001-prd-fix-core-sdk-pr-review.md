# Task List: Fix @seedid/core SDK PR Review Issues

## Relevant Files

- `sdks/core/src/index.ts` - Main implementation with KDF, HKDF, and helper functions
- `sdks/core/__tests__/core.test.ts` - Test suite with fixtures
- `sdks/core/README.md` - Package documentation
- `sdks/core/package.json` - Package metadata and configuration
- `sdks/core/tsconfig.json` - TypeScript configuration

### Notes

- Tests use Vitest framework
- Run tests with: `npm test` (or `cd sdks/core && npm test`)
- Build with: `npm run build` (or `cd sdks/core && npm run build`)

## Tasks

- [ ] 1.0 Fix Critical Security Issues
  - [ ] 1.1 Add prominent security warning section to README.md about zero-salt deterministic generation trade-offs
  - [ ] 1.2 Add JSDoc comments with @security tags to deriveMasterKey() documenting salt usage and risks
  - [ ] 1.3 Replace unsafe `as unknown as Uint8Array` type cast in hkdf() (line 64) with runtime validation
  - [ ] 1.4 Replace unsafe `as Uint8Array` type cast in deriveMasterKey() (line 107) with runtime validation
  - [ ] 1.5 Verify HKDF max length validation is present (should already exist at line 45-47)
  - [ ] 1.6 Write tests for HKDF max length validation (length > 8160 should throw)
- [ ] 2.0 Add Input Validation and Runtime Safety
  - [ ] 2.1 Add validation in normalizePassphrase() to reject empty strings after normalization
  - [ ] 2.2 Add validation in deriveMasterKey() to reject zero or negative KDF parameters (m, t, p, L)
  - [ ] 2.3 Add validation in helper functions (forNostr, forDidKey, forWallet) to ensure master key is exactly 32 bytes
  - [ ] 2.4 Improve error handling in Web Crypto detection (index.ts:16-20) to log caught errors
  - [ ] 2.5 Write tests for all new validation logic
- [ ] 3.0 Improve Test Coverage
  - [ ] 3.1 Add edge case test: empty passphrase (should throw after validation added)
  - [ ] 3.2 Add edge case test: very long passphrase (>1KB) to ensure it works
  - [ ] 3.3 Add edge case test: invalid master key length in helper functions (should throw)
  - [ ] 3.4 Add edge case test: HKDF with length=0 (should throw)
  - [ ] 3.5 Add edge case test: invalid KDF parameters (zero/negative values, should throw)
  - [ ] 3.6 Add error path test: unsupported algorithm string
  - [ ] 3.7 Add test: Unicode normalization edge cases (various composed/decomposed forms)
- [ ] 4.0 Add Comprehensive Documentation
  - [ ] 4.1 Add JSDoc to normalizePassphrase() with description, params, return, examples
  - [ ] 4.2 Add JSDoc to hkdf() with description, params, return, security notes, examples
  - [ ] 4.3 Add JSDoc to deriveMasterKey() with description, params, return, security warnings, examples
  - [ ] 4.4 Add JSDoc to helper functions (forNostr, forDidKey, forWallet) with descriptions and examples
  - [ ] 4.5 Update README.md with Installation section (npm install commands)
  - [ ] 4.6 Update README.md with Development section (build, test, clean commands)
  - [ ] 4.7 Update README.md with Security Best Practices section (salt usage, entropy requirements, validation)
  - [ ] 4.8 Update README.md with Usage Examples section showing common patterns
- [ ] 5.0 Update Package Metadata
  - [ ] 5.1 Add description field to package.json
  - [ ] 5.2 Add license field (Apache-2.0) to package.json
  - [ ] 5.3 Add repository field with directory to package.json
  - [ ] 5.4 Add keywords array to package.json
  - [ ] 5.5 Add author field to package.json
