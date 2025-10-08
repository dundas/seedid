/**
 * Wallet address derivation types and utilities
 */

export interface WalletAccount {
  address: string;
  publicKey: Uint8Array;
}

export interface SigningKey {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  address: string;
}

export type Chain = 'eth' | 'btc' | 'sol';
