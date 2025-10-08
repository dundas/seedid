/**
 * Ethereum address derivation
 * 
 * Derives ETH addresses from SeedID wallet roots using BIP32 HD derivation.
 * Path: m/44'/60'/0'/0/{index} (BIP44 Ethereum standard)
 */

import { HDKey } from '@scure/bip32';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { Point } from '@noble/secp256k1';
import { WalletAccount, SigningKey } from './derivation.js';

/**
 * Apply EIP-55 checksum encoding to an Ethereum address.
 * Mixed-case encoding that includes error detection.
 */
function toChecksumAddress(address: string): string {
  const addr = address.toLowerCase().replace('0x', '');
  const hash = keccak_256(new TextEncoder().encode(addr));
  let checksumAddr = '0x';
  
  for (let i = 0; i < addr.length; i++) {
    // If hash byte is >= 8, uppercase the character
    if ((hash[i >> 1] >> (i % 2 === 0 ? 4 : 0) & 0x0f) >= 8) {
      checksumAddr += addr[i].toUpperCase();
    } else {
      checksumAddr += addr[i];
    }
  }
  
  return checksumAddr;
}

/**
 * Derive an Ethereum address from a wallet root.
 * 
 * @param root 32-byte ETH root from forWallet(master, 'eth')
 * @param index Account index (default 0)
 * @returns WalletAccount with EIP-55 checksummed address
 * 
 * @example
 * const ethRoot = await forWallet(master, 'eth');
 * const account = await deriveEthAddress(ethRoot, 0);
 * console.log(account.address); // 0x742d35Cc...
 */
export async function deriveEthAddress(
  root: Uint8Array,
  index: number = 0
): Promise<WalletAccount> {
  if (!(root instanceof Uint8Array) || root.length !== 32) throw new Error('ETH root must be 32 bytes');
  if (!Number.isInteger(index) || index < 0) throw new Error('index must be a non-negative integer');
  // Create HD key from root
  const hdkey = HDKey.fromMasterSeed(root);
  
  // Derive BIP44 path: m/44'/60'/0'/0/{index}
  const path = `m/44'/60'/0'/0/${index}`;
  const derived = hdkey.derive(path);
  
  if (!derived.publicKey) {
    throw new Error('Failed to derive public key');
  }
  
  // Decompress compressed pubkey (33 bytes) to uncompressed (65 bytes), then strip 0x04 prefix
  const uncompressed = Point.fromHex(derived.publicKey).toRawBytes(false);
  const pubkey = uncompressed.slice(1); // 64 bytes (x||y)
  
  // Keccak-256 hash of public key, take last 20 bytes
  const hash = keccak_256(pubkey);
  const addressBytes = hash.slice(-20);
  
  // Convert to hex and apply EIP-55 checksum
  let addressHex = '';
  for (let i = 0; i < addressBytes.length; i++) {
    addressHex += addressBytes[i].toString(16).padStart(2, '0');
  }
  const address = toChecksumAddress('0x' + addressHex);
  
  return {
    address,
    publicKey: derived.publicKey
  };
}

/**
 * Derive an Ethereum signing key from a wallet root.
 * 
 * ⚠️ SECURITY WARNING:
 * - Keep private keys in memory only
 * - Use zeroize() to clear after signing
 * - Never log or transmit private keys
 * 
 * @param root 32-byte ETH root from forWallet(master, 'eth')
 * @param index Account index (default 0)
 * @returns SigningKey with private key included
 */
export async function deriveEthSigningKey(
  root: Uint8Array,
  index: number = 0
): Promise<SigningKey> {
  if (!(root instanceof Uint8Array) || root.length !== 32) throw new Error('ETH root must be 32 bytes');
  if (!Number.isInteger(index) || index < 0) throw new Error('index must be a non-negative integer');
  // Create HD key from root
  const hdkey = HDKey.fromMasterSeed(root);
  
  // Derive BIP44 path: m/44'/60'/0'/0/{index}
  const path = `m/44'/60'/0'/0/${index}`;
  const derived = hdkey.derive(path);
  
  if (!derived.privateKey || !derived.publicKey) {
    throw new Error('Failed to derive keys');
  }
  
  // Decompress compressed pubkey to uncompressed and strip 0x04
  const uncompressed = Point.fromHex(derived.publicKey).toRawBytes(false);
  const pubkey = uncompressed.slice(1);
  
  // Keccak-256 hash of public key, take last 20 bytes
  const hash = keccak_256(pubkey);
  const addressBytes = hash.slice(-20);
  
  // Convert to hex and apply EIP-55 checksum
  let addressHex = '';
  for (let i = 0; i < addressBytes.length; i++) {
    addressHex += addressBytes[i].toString(16).padStart(2, '0');
  }
  const address = toChecksumAddress('0x' + addressHex);
  
  return {
    privateKey: derived.privateKey,
    publicKey: derived.publicKey,
    address
  };
}
