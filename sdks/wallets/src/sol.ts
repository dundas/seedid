/**
 * Solana address derivation
 * 
 * Derives SOL addresses from SeedID wallet roots using Ed25519.
 * Uses direct Ed25519 keypair generation from root (non-standard but simpler).
 */

import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import bs58 from 'bs58';
import { WalletAccount, SigningKey } from './derivation.js';

/**
 * Derive Ed25519 seed for Solana from root and index.
 * For index 0, uses root directly. For index > 0, hashes root + index.
 *
 * @param root 32-byte SOL root
 * @param index Account index
 * @returns 32-byte Ed25519 seed
 */
function deriveSolSeed(root: Uint8Array, index: number): Uint8Array {
  if (index === 0) return root;

  const indexBytes = new Uint8Array(4);
  new DataView(indexBytes.buffer).setUint32(0, index, false);
  const combined = new Uint8Array(root.length + indexBytes.length);
  combined.set(root);
  combined.set(indexBytes, root.length);
  return sha512(combined).slice(0, 32);
}

/**
 * Derive a Solana address from a wallet root.
 * 
 * Uses the root directly as Ed25519 seed (non-standard but deterministic).
 * For multi-account, we hash root with index.
 * 
 * @param root 32-byte SOL root from forWallet(master, 'sol')
 * @param index Account index (default 0)
 * @returns WalletAccount with Base58-encoded address
 * 
 * @example
 * const solRoot = await forWallet(master, 'sol');
 * const account = await deriveSolAddress(solRoot, 0);
 * console.log(account.address); // DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK
 */
export async function deriveSolAddress(
  root: Uint8Array,
  index: number = 0
): Promise<WalletAccount> {
  if (!(root instanceof Uint8Array) || root.length !== 32) throw new Error('SOL root must be 32 bytes');
  if (!Number.isInteger(index) || index < 0) throw new Error('index must be a non-negative integer');

  // Derive Ed25519 seed from root and index
  const seed = deriveSolSeed(root, index);

  // Generate Ed25519 keypair from seed
  // Use seed directly as private key (must be 32 bytes)
  const privateKey = seed;
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  
  // Solana address is the Base58-encoded public key
  const address = bs58.encode(publicKey);
  
  return {
    address,
    publicKey
  };
}

/**
 * Derive a Solana signing key from a wallet root.
 * 
 * ⚠️ SECURITY WARNING:
 * - Keep private keys in memory only
 * - Use zeroize() to clear after signing
 * - Never log or transmit private keys
 * 
 * @param root 32-byte SOL root from forWallet(master, 'sol')
 * @param index Account index (default 0)
 * @returns SigningKey with Ed25519 private key included
 */
export async function deriveSolSigningKey(
  root: Uint8Array,
  index: number = 0
): Promise<SigningKey> {
  if (!(root instanceof Uint8Array) || root.length !== 32) throw new Error('SOL root must be 32 bytes');
  if (!Number.isInteger(index) || index < 0) throw new Error('index must be a non-negative integer');

  // Derive Ed25519 seed from root and index
  const seed = deriveSolSeed(root, index);

  // Generate Ed25519 keypair from seed
  // Use seed directly as private key (must be 32 bytes)
  const privateKey = seed;
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  
  // Solana address is the Base58-encoded public key
  const address = bs58.encode(publicKey);
  
  return {
    privateKey,
    publicKey,
    address
  };
}
