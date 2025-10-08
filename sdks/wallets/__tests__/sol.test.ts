import { describe, it, expect } from 'vitest';
import { deriveSolAddress, deriveSolSigningKey } from '../src/sol.js';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const start = i * 2;
    bytes[i] = parseInt(clean.substring(start, start + 2), 16);
  }
  return bytes;
}

describe('SOL address derivation', () => {
  // Use known SOL root from integration test
  const solRoot = hexToBytes('7ab3ecb36fcd5cad7b16f650e46da3acbc2eb8f022bac1a0322f97797d5568a0');

  it('derives valid SOL address from root', async () => {
    const account = await deriveSolAddress(solRoot, 0);
    
    // Address should be Base58 encoded (32-44 chars typical for Solana)
    expect(account.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    
    // Public key should be 32 bytes (Ed25519)
    expect(account.publicKey.length).toBe(32);
  });

  it('different indices produce different addresses', async () => {
    const account0 = await deriveSolAddress(solRoot, 0);
    const account1 = await deriveSolAddress(solRoot, 1);
    const account2 = await deriveSolAddress(solRoot, 2);
    
    expect(account0.address).not.toBe(account1.address);
    expect(account1.address).not.toBe(account2.address);
    expect(account0.address).not.toBe(account2.address);
  });

  it('derives signing key with private key', async () => {
    const signingKey = await deriveSolSigningKey(solRoot, 0);
    
    // Private key should be 32 bytes (Ed25519 scalar)
    expect(signingKey.privateKey.length).toBe(32);
    
    // Should have same address as deriveSolAddress
    const account = await deriveSolAddress(solRoot, 0);
    expect(signingKey.address).toBe(account.address);
    
    // Should have same public key
    expect(signingKey.publicKey).toEqual(account.publicKey);
  });

  it('deterministic - same root and index always produce same address', async () => {
    const account1 = await deriveSolAddress(solRoot, 0);
    const account2 = await deriveSolAddress(solRoot, 0);
    
    expect(account1.address).toBe(account2.address);
    expect(account1.publicKey).toEqual(account2.publicKey);
  });

  it('address format is valid Base58', async () => {
    const account = await deriveSolAddress(solRoot, 0);
    
    // Should not contain invalid Base58 characters (0, O, I, l)
    expect(account.address).not.toMatch(/[0OIl]/);
    
    // Should be reasonable length for Solana address
    expect(account.address.length).toBeGreaterThanOrEqual(32);
    expect(account.address.length).toBeLessThanOrEqual(44);
  });
});
