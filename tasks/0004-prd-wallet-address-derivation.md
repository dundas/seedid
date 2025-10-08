# PRD: Wallet Address Derivation (Path B - SeedID-Derived Wallets)

## Summary
Extend `@seedid/wallets` to derive actual wallet addresses and signing keys from the chain roots we already generate. This enables users to receive and send ETH/BTC/SOL using only their SeedID passphrase, with full self-custody and deterministic recovery.

## Goals
- Derive valid wallet addresses for ETH, BTC, and SOL from existing chain roots
- Generate signing keys that can be used for transactions
- Support standard derivation paths (BIP32/BIP44/BIP84 for BTC, SLIP-10 for SOL)
- Provide clear API for address generation and transaction signing
- Maintain security: keys only in memory, optional encrypted export

## Non-Goals (v0.2)
- Hardware wallet integration
- Multi-signature wallets
- Transaction broadcasting (use existing RPC providers)
- UI/wallet management interface (SDK only)

## Technical Approach

### ETH (Ethereum + EVM chains)
- **Input**: 32-byte ETH root from `forWallet(master, 'eth')`
- **Derivation**: 
  - Use root as seed for BIP32 HD wallet (secp256k1)
  - Path: `m/44'/60'/0'/0/0` (standard Ethereum BIP44)
  - Alternative: Direct secp256k1 private key from root (simpler, non-standard)
- **Address**: Keccak-256(publicKey)[12:] → EIP-55 checksum encoding
- **Output**: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` format

### BTC (Bitcoin)
- **Input**: 32-byte BTC root from `forWallet(master, 'btc')`
- **Derivation**:
  - BIP32 HD wallet (secp256k1)
  - Path: `m/84'/0'/0'/0/0` (BIP84 native SegWit)
  - Optional: `m/86'/0'/0'/0/0` (BIP86 Taproot)
- **Address**: P2WPKH (bc1q...) or P2TR (bc1p...)
- **Output**: Bech32/Bech32m encoded address

### SOL (Solana)
- **Input**: 32-byte SOL root from `forWallet(master, 'sol')`
- **Derivation**:
  - SLIP-10 Ed25519 (or direct Ed25519 from root)
  - Path: `m/44'/501'/0'/0'` (standard Solana)
- **Address**: Ed25519 public key → Base58 encoding
- **Output**: `DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK` format

## API Design

```typescript
// Extend @seedid/wallets
export type Chain = 'eth' | 'btc' | 'sol';

export interface WalletAccount {
  address: string;
  publicKey: Uint8Array;
  // Private key NOT exposed by default
}

export interface SigningKey {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  address: string;
}

// Derive address at index (default 0)
export async function deriveAddress(
  master: Uint8Array,
  chain: Chain,
  index?: number
): Promise<WalletAccount>;

// Get signing key (use carefully, keep in memory only)
export async function deriveSigningKey(
  master: Uint8Array,
  chain: Chain,
  index?: number
): Promise<SigningKey>;

// Convenience wrappers
export async function deriveEthAddress(master: Uint8Array, index?: number): Promise<WalletAccount>;
export async function deriveBtcAddress(master: Uint8Array, index?: number): Promise<WalletAccount>;
export async function deriveSolAddress(master: Uint8Array, index?: number): Promise<WalletAccount>;
```

## Dependencies
- `@scure/bip32` - BIP32 HD derivation (ETH, BTC)
- `@noble/secp256k1` - secp256k1 operations (ETH, BTC)
- `@noble/ed25519` - Ed25519 operations (SOL)
- `@noble/hashes` - Keccak-256, SHA-256, RIPEMD-160
- `bs58` - Base58 encoding (SOL, BTC)
- `bech32` - Bech32/Bech32m encoding (BTC)

## Security Considerations
- Private keys should only exist in memory during signing
- Provide `zeroize()` utility to clear sensitive buffers
- Document that users should never log/transmit private keys
- Recommend encrypted storage if persistence needed
- Warn about address reuse (support index parameter for new addresses)

## Acceptance Criteria
- Derive valid ETH address from root, verify with known test vectors
- Derive valid BTC SegWit address from root, verify with known test vectors
- Derive valid SOL address from root, verify with known test vectors
- Sign sample transactions for each chain (verify signature validity)
- Tests validate against standard test vectors (BIP32, SLIP-10)
- README with security warnings and usage examples

## Test Vectors
- Use standard BIP32/BIP39 test vectors where applicable
- Generate SeedID-specific fixtures for our HKDF-based roots
- Cross-validate with existing wallet implementations (MetaMask, Phantom, Sparrow)

## Risks
- Non-standard derivation (HKDF roots vs BIP39 mnemonic) may confuse users
- Need clear docs: "This is NOT a BIP39 wallet, cannot import to MetaMask directly"
- Address reuse if index not incremented
- Key management complexity (when to keep keys in memory vs clear)

## Future Enhancements (v0.3+)
- Multi-account support (account index in path)
- Change addresses for BTC
- Token/NFT support (ERC20, SPL)
- Transaction building helpers
- Encrypted key export/import
