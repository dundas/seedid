import { forWallet } from '@seedid/core';

export type Chain = 'eth' | 'btc' | 'sol';

/**
 * Derive per-chain root material from a 32-byte SeedID master key.
 * Delegates to @seedid/core canonical HKDF labels via forWallet().
 *
 * @param master 32-byte master key derived via @seedid/core
 * @param chain 'eth' | 'btc' | 'sol'
 * @returns 32-byte chain root material
 */
export async function deriveWalletRoot(master: Uint8Array, chain: Chain): Promise<Uint8Array> {
  if (master.length !== 32) throw new Error('master key must be 32 bytes');
  if (chain !== 'eth' && chain !== 'btc' && chain !== 'sol') {
    throw new Error(`Unsupported chain: ${String(chain)}`);
  }
  return forWallet(master, chain);
}

/** Convenience wrapper for ETH root */
export async function forEthRoot(master: Uint8Array): Promise<Uint8Array> {
  if (master.length !== 32) throw new Error('master key must be 32 bytes');
  return deriveWalletRoot(master, 'eth');
}

/** Convenience wrapper for BTC root */
export async function forBtcRoot(master: Uint8Array): Promise<Uint8Array> {
  if (master.length !== 32) throw new Error('master key must be 32 bytes');
  return deriveWalletRoot(master, 'btc');
}

/** Convenience wrapper for SOL root */
export async function forSolRoot(master: Uint8Array): Promise<Uint8Array> {
  if (master.length !== 32) throw new Error('master key must be 32 bytes');
  return deriveWalletRoot(master, 'sol');
}

// Address derivation & signing exports
export { deriveEthAddress, deriveEthSigningKey } from './eth.js';
export { deriveBtcAddress, deriveBtcSigningKey } from './btc.js';
export { deriveSolAddress, deriveSolSigningKey } from './sol.js';
export { zeroize } from './utils.js';
