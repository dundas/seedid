## Relevant Files

- `seedid_community/sdks/wallets/package.json` - Package manifest (scripts, metadata, deps on `@seedid/core`).
- `seedid_community/sdks/wallets/tsconfig.json` - TypeScript configuration for ESM build + types.
- `seedid_community/sdks/wallets/README.md` - SDK docs: API, usage, installation, development.
- `seedid_community/sdks/wallets/src/index.ts` - Main implementation and exports.
- `seedid_community/sdks/wallets/__tests__/wallets.test.ts` - Unit tests for chain root derivation + validation.
- `seedid_community/sdks/wallets/fixtures/wallet_eth.json` - ETH HKDF root fixture.
- `seedid_community/sdks/wallets/fixtures/wallet_btc.json` - BTC HKDF root fixture.
- `seedid_community/sdks/wallets/fixtures/wallet_sol.json` - SOL HKDF root fixture.

### Notes

- Co-locate tests with the package under `seedid_community/sdks/wallets/` per project conventions.
- Use Vitest for tests (align with `@seedid/core`).
- Prefer local copies of fixtures to avoid cross-package coupling.
- Validate inputs thoroughly (master key length, supported chain enum).

## Tasks

- [ ] 1.0 Scaffold package structure
  - [ ] 1.1 Create directory `seedid_community/sdks/wallets/` with subdirs: `src/`, `__tests__/`, `fixtures/`.
  - [ ] 1.2 Add `package.json` with:
    - `name: "@seedid/wallets"`, `type: "module"`, `main: dist/index.js`, `types: dist/index.d.ts`.
    - Scripts: `build`, `test`, `clean`.
    - Dependencies: `@seedid/core`.
    - Dev deps: `typescript`, `@types/node`, `vitest`.
    - Metadata: `description`, `license: Apache-2.0`, `repository` (with directory), `keywords`, `author`.
  - [ ] 1.3 Add `tsconfig.json` matching core style (`lib: ["ES2020","DOM"]`, ESM, declarations, rootDir/outDir).
  - [ ] 1.4 Add `README.md` with summary, API, install/development instructions, and usage examples.

- [ ] 2.0 Implement root derivation API in `src/index.ts`
  - [ ] 2.1 Import from `@seedid/core`: `forWallet`, `HKDF_SALT`, canonical labels.
  - [ ] 2.2 Define `export type Chain = 'eth' | 'btc' | 'sol'`.
  - [ ] 2.3 Implement `deriveWalletRoot(master: Uint8Array, chain: Chain)`:
    - Validate `master.length === 32`.
    - Validate supported `chain`.
    - Delegate to `forWallet(master, chain)`.
  - [ ] 2.4 Implement convenience wrappers: `forEthRoot`, `forBtcRoot`, `forSolRoot` with 32-byte guard.
  - [ ] 2.5 Add JSDoc for API methods (params, returns, examples; note security guidance delegates to core).

- [ ] 3.0 Fixtures and tests
  - [ ] 3.1 Copy fixtures into `fixtures/`: `wallet_eth.json`, `wallet_btc.json`, `wallet_sol.json` from community fixtures used by core.
  - [ ] 3.2 Create `__tests__/wallets.test.ts` that:
    - [ ] 3.2.1 Loads each fixture and verifies `deriveWalletRoot(master, chain)` HKDF root matches expected.
    - [ ] 3.2.2 Validates convenience wrappers equal `deriveWalletRoot` outputs.
    - [ ] 3.2.3 Input validation tests: wrong master key length throws; unsupported chain throws.
  - [ ] 3.3 Ensure Node/ESM-compatible path resolution as used in core tests.

- [ ] 4.0 Documentation & metadata
  - [ ] 4.1 README usage examples: deriving ETH/BTC/SOL roots from a known master.
  - [ ] 4.2 Security notes: root material is not addresses/keys; consult chain-specific derivation docs.
  - [ ] 4.3 Ensure `package.json` repository path is `sdks/wallets` and license `Apache-2.0`.

- [ ] 5.0 (Optional) CI integration
  - [ ] 5.1 Update community repo CI to run `sdks/wallets` tests along with `sdks/core`.
  - [ ] 5.2 Add a job matrix for packages if needed.
