import { describe, it, expect } from 'vitest';
import { deriveBtcAddress, deriveBtcSigningKey } from '../src/btc.js';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const start = i * 2;
    bytes[i] = parseInt(clean.substring(start, start + 2), 16);
  }
  return bytes;
}

describe('BTC address derivation', () => {
  // Use known BTC root from integration test
  const btcRoot = hexToBytes('af16b16d5f31fed0a4e3b67ccd65735b286ebd7abe27883d6df64fd65784c3d6');

  it('derives valid BTC SegWit address from root', async () => {
    const account = await deriveBtcAddress(btcRoot, 0, 'segwit');
    
    // Address should start with bc1q (P2WPKH SegWit)
    expect(account.address).toMatch(/^bc1q[a-z0-9]{38,58}$/);
    
    // Public key should be 33 bytes (compressed secp256k1)
    expect(account.publicKey.length).toBe(33);
    expect([0x02, 0x03]).toContain(account.publicKey[0]);
  });

  it('different indices produce different addresses', async () => {
    const account0 = await deriveBtcAddress(btcRoot, 0);
    const account1 = await deriveBtcAddress(btcRoot, 1);
    const account2 = await deriveBtcAddress(btcRoot, 2);
    
    expect(account0.address).not.toBe(account1.address);
    expect(account1.address).not.toBe(account2.address);
    expect(account0.address).not.toBe(account2.address);
  });

  it('derives signing key with private key', async () => {
    const signingKey = await deriveBtcSigningKey(btcRoot, 0);
    
    // Private key should be 32 bytes
    expect(signingKey.privateKey.length).toBe(32);
    
    // Should have same address as deriveBtcAddress
    const account = await deriveBtcAddress(btcRoot, 0);
    expect(signingKey.address).toBe(account.address);
    
    // Should have same public key
    expect(signingKey.publicKey).toEqual(account.publicKey);
  });

  it('deterministic - same root and index always produce same address', async () => {
    const account1 = await deriveBtcAddress(btcRoot, 0);
    const account2 = await deriveBtcAddress(btcRoot, 0);
    
    expect(account1.address).toBe(account2.address);
    expect(account1.publicKey).toEqual(account2.publicKey);
  });

  it('address is valid Bech32 format', async () => {
    const account = await deriveBtcAddress(btcRoot, 0);
    
    // Should not contain invalid Bech32 characters (uppercase, O, I, etc.)
    expect(account.address).toMatch(/^[a-z0-9]+$/);
    
    // Should be reasonable length for SegWit address
    expect(account.address.length).toBeGreaterThanOrEqual(42);
    expect(account.address.length).toBeLessThanOrEqual(62);
  });
});
