/**
 * Bitcoin address derivation
 * 
 * Derives BTC addresses from SeedID wallet roots using BIP32 HD derivation.
 * Path: m/84'/0'/0'/0/{index} (BIP84 native SegWit standard)
 */

import { HDKey } from '@scure/bip32';
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { bech32 } from 'bech32';
import { WalletAccount, SigningKey } from './derivation.js';

/**
 * Compute HASH160 (SHA-256 then RIPEMD-160) of data.
 * Standard Bitcoin address hashing.
 */
function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

/**
 * Encode a witness program as Bech32 address.
 * 
 * @param witnessVersion Witness version (0 for P2WPKH, 1 for P2TR)
 * @param witnessProgram The witness program bytes
 * @param hrp Human-readable part ('bc' for mainnet, 'tb' for testnet)
 */
function encodeBech32(
  witnessVersion: number,
  witnessProgram: Uint8Array,
  hrp: string = 'bc'
): string {
  // Convert witness program to 5-bit words
  const words = bech32.toWords(witnessProgram);
  // Prepend witness version
  const data = [witnessVersion, ...words];
  // Encode as bech32 (v0) or bech32m (v1+)
  const encoding = witnessVersion === 0 ? 'bech32' : 'bech32m';
  return bech32.encode(hrp, data, encoding as any);
}

/**
 * Derive a Bitcoin SegWit (P2WPKH) address from a wallet root.
 *
 * Uses BIP84 path: m/84'/0'/0'/0/{index} for native SegWit.
 * Taproot (P2TR) is not yet supported.
 *
 * @param root 32-byte BTC root from forWallet(master, 'btc')
 * @param index Account index (default 0)
 * @returns WalletAccount with Bech32-encoded address (bc1q...)
 *
 * @example
 * const btcRoot = await forWallet(master, 'btc');
 * const account = await deriveBtcAddress(btcRoot, 0);
 * console.log(account.address); // bc1q...
 */
export async function deriveBtcAddress(
  root: Uint8Array,
  index: number = 0
): Promise<WalletAccount> {
  if (!(root instanceof Uint8Array) || root.length !== 32) throw new Error('BTC root must be 32 bytes');
  if (!Number.isInteger(index) || index < 0) throw new Error('index must be a non-negative integer');

  // Create HD key from root
  const hdkey = HDKey.fromMasterSeed(root);

  // Derive BIP84 path for SegWit: m/84'/0'/0'/0/{index}
  const path = `m/84'/0'/0'/0/${index}`;
  const derived = hdkey.derive(path);

  if (!derived.publicKey) {
    throw new Error('Failed to derive public key');
  }

  // Get compressed public key (33 bytes)
  const pubkey = derived.publicKey;

  // P2WPKH: witness version 0, hash160 of pubkey
  const witnessProgram = hash160(pubkey);
  const address = encodeBech32(0, witnessProgram, 'bc');

  return {
    address,
    publicKey: pubkey
  };
}

/**
 * Derive a Bitcoin SegWit (P2WPKH) signing key from a wallet root.
 *
 * ⚠️ SECURITY WARNING:
 * - Keep private keys in memory only
 * - Use zeroize() to clear after signing
 * - Never log or transmit private keys
 *
 * @param root 32-byte BTC root from forWallet(master, 'btc')
 * @param index Account index (default 0)
 * @returns SigningKey with private key included
 */
export async function deriveBtcSigningKey(
  root: Uint8Array,
  index: number = 0
): Promise<SigningKey> {
  if (!(root instanceof Uint8Array) || root.length !== 32) throw new Error('BTC root must be 32 bytes');
  if (!Number.isInteger(index) || index < 0) throw new Error('index must be a non-negative integer');

  // Create HD key from root
  const hdkey = HDKey.fromMasterSeed(root);

  // Derive BIP84 path for SegWit: m/84'/0'/0'/0/{index}
  const path = `m/84'/0'/0'/0/${index}`;
  const derived = hdkey.derive(path);

  if (!derived.privateKey || !derived.publicKey) {
    throw new Error('Failed to derive keys');
  }

  // Get compressed public key (33 bytes)
  const pubkey = derived.publicKey;

  // P2WPKH: witness version 0, hash160 of pubkey
  const witnessProgram = hash160(pubkey);
  const address = encodeBech32(0, witnessProgram, 'bc');

  return {
    privateKey: derived.privateKey,
    publicKey: pubkey,
    address
  };
}
