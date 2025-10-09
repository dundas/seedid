import { describe, it, expect } from 'vitest';
import { deriveEthAddress, deriveEthSigningKey } from '../src/eth.js';
import { deriveBtcAddress, deriveBtcSigningKey } from '../src/btc.js';
import { deriveSolAddress, deriveSolSigningKey } from '../src/sol.js';

/**
 * Cross-chain input validation tests
 *
 * WHY: Input validation is security-critical because it prevents:
 * - Buffer overflows from incorrect root sizes (cryptographic operations expect 32 bytes)
 * - Array index errors from negative indices (can cause undefined behavior)
 * - Cryptographic failures from malformed keys (wrong key lengths break ECDH, HMAC, etc.)
 * - Type confusion attacks (non-Uint8Array inputs could expose internal state)
 * - Integer overflow issues (non-integer indices can break derivation path logic)
 *
 * WHAT: Ensures all derivation functions consistently validate:
 * - root: must be Uint8Array of exactly 32 bytes (256-bit cryptographic material)
 * - index: must be non-negative integer (valid BIP32/BIP44/SLIP-10 child index)
 *
 * These validations happen BEFORE any cryptographic operations to fail fast
 * and provide clear error messages rather than obscure crypto library errors.
 */

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const start = i * 2;
    bytes[i] = parseInt(clean.substring(start, start + 2), 16);
  }
  return bytes;
}

// Valid 32-byte roots for testing
const validEthRoot = hexToBytes('a083f9a515a501610a0cd9cc619c3fd4b06e4886f024243345c45265a6da8f6c');
const validBtcRoot = hexToBytes('af16b16d5f31fed0a4e3b67ccd65735b286ebd7abe27883d6df64fd65784c3d6');
const validSolRoot = hexToBytes('2fbd5766e49832e3b67c95e5f4f9a16b2a1e5c76f5a0e8e4e7a6f9b0c8d5e3f1');

describe('ETH validation', () => {
  describe('root validation', () => {
    it('rejects non-Uint8Array root', async () => {
      await expect(deriveEthAddress([] as any, 0)).rejects.toThrow('ETH root must be 32 bytes');
      await expect(deriveEthAddress('not a buffer' as any, 0)).rejects.toThrow('ETH root must be 32 bytes');
      await expect(deriveEthAddress(null as any, 0)).rejects.toThrow('ETH root must be 32 bytes');
    });

    it('rejects root with wrong length', async () => {
      await expect(deriveEthAddress(new Uint8Array(31), 0)).rejects.toThrow('ETH root must be 32 bytes');
      await expect(deriveEthAddress(new Uint8Array(33), 0)).rejects.toThrow('ETH root must be 32 bytes');
      await expect(deriveEthAddress(new Uint8Array(0), 0)).rejects.toThrow('ETH root must be 32 bytes');
    });
  });

  describe('index validation', () => {
    it('rejects negative index', async () => {
      await expect(deriveEthAddress(validEthRoot, -1)).rejects.toThrow('index must be a non-negative integer');
      await expect(deriveEthAddress(validEthRoot, -100)).rejects.toThrow('index must be a non-negative integer');
    });

    it('rejects non-integer index', async () => {
      await expect(deriveEthAddress(validEthRoot, 1.5)).rejects.toThrow('index must be a non-negative integer');
      await expect(deriveEthAddress(validEthRoot, NaN)).rejects.toThrow('index must be a non-negative integer');
      await expect(deriveEthAddress(validEthRoot, Infinity)).rejects.toThrow('index must be a non-negative integer');
    });
  });

  describe('signing key validation', () => {
    it('validates root for signing key', async () => {
      await expect(deriveEthSigningKey(new Uint8Array(31), 0)).rejects.toThrow('ETH root must be 32 bytes');
    });

    it('validates index for signing key', async () => {
      await expect(deriveEthSigningKey(validEthRoot, -1)).rejects.toThrow('index must be a non-negative integer');
    });
  });
});

describe('BTC validation', () => {
  describe('root validation', () => {
    it('rejects non-Uint8Array root', async () => {
      await expect(deriveBtcAddress([] as any, 0)).rejects.toThrow('BTC root must be 32 bytes');
      await expect(deriveBtcAddress('not a buffer' as any, 0)).rejects.toThrow('BTC root must be 32 bytes');
      await expect(deriveBtcAddress(null as any, 0)).rejects.toThrow('BTC root must be 32 bytes');
    });

    it('rejects root with wrong length', async () => {
      await expect(deriveBtcAddress(new Uint8Array(31), 0)).rejects.toThrow('BTC root must be 32 bytes');
      await expect(deriveBtcAddress(new Uint8Array(33), 0)).rejects.toThrow('BTC root must be 32 bytes');
      await expect(deriveBtcAddress(new Uint8Array(0), 0)).rejects.toThrow('BTC root must be 32 bytes');
    });
  });

  describe('index validation', () => {
    it('rejects negative index', async () => {
      await expect(deriveBtcAddress(validBtcRoot, -1)).rejects.toThrow('index must be a non-negative integer');
      await expect(deriveBtcAddress(validBtcRoot, -100)).rejects.toThrow('index must be a non-negative integer');
    });

    it('rejects non-integer index', async () => {
      await expect(deriveBtcAddress(validBtcRoot, 1.5)).rejects.toThrow('index must be a non-negative integer');
      await expect(deriveBtcAddress(validBtcRoot, NaN)).rejects.toThrow('index must be a non-negative integer');
      await expect(deriveBtcAddress(validBtcRoot, Infinity)).rejects.toThrow('index must be a non-negative integer');
    });
  });

  describe('signing key validation', () => {
    it('validates root for signing key', async () => {
      await expect(deriveBtcSigningKey(new Uint8Array(31), 0)).rejects.toThrow('BTC root must be 32 bytes');
    });

    it('validates index for signing key', async () => {
      await expect(deriveBtcSigningKey(validBtcRoot, -1)).rejects.toThrow('index must be a non-negative integer');
    });
  });
});

describe('SOL validation', () => {
  describe('root validation', () => {
    it('rejects non-Uint8Array root', async () => {
      await expect(deriveSolAddress([] as any, 0)).rejects.toThrow('SOL root must be 32 bytes');
      await expect(deriveSolAddress('not a buffer' as any, 0)).rejects.toThrow('SOL root must be 32 bytes');
      await expect(deriveSolAddress(null as any, 0)).rejects.toThrow('SOL root must be 32 bytes');
    });

    it('rejects root with wrong length', async () => {
      await expect(deriveSolAddress(new Uint8Array(31), 0)).rejects.toThrow('SOL root must be 32 bytes');
      await expect(deriveSolAddress(new Uint8Array(33), 0)).rejects.toThrow('SOL root must be 32 bytes');
      await expect(deriveSolAddress(new Uint8Array(0), 0)).rejects.toThrow('SOL root must be 32 bytes');
    });
  });

  describe('index validation', () => {
    it('rejects negative index', async () => {
      await expect(deriveSolAddress(validSolRoot, -1)).rejects.toThrow('index must be a non-negative integer');
      await expect(deriveSolAddress(validSolRoot, -100)).rejects.toThrow('index must be a non-negative integer');
    });

    it('rejects non-integer index', async () => {
      await expect(deriveSolAddress(validSolRoot, 1.5)).rejects.toThrow('index must be a non-negative integer');
      await expect(deriveSolAddress(validSolRoot, NaN)).rejects.toThrow('index must be a non-negative integer');
      await expect(deriveSolAddress(validSolRoot, Infinity)).rejects.toThrow('index must be a non-negative integer');
    });
  });

  describe('signing key validation', () => {
    it('validates root for signing key', async () => {
      await expect(deriveSolSigningKey(new Uint8Array(31), 0)).rejects.toThrow('SOL root must be 32 bytes');
    });

    it('validates index for signing key', async () => {
      await expect(deriveSolSigningKey(validSolRoot, -1)).rejects.toThrow('index must be a non-negative integer');
    });
  });
});

describe('Cross-chain consistency', () => {
  it('all chains accept valid 32-byte root and index 0', async () => {
    await expect(deriveEthAddress(validEthRoot, 0)).resolves.toBeDefined();
    await expect(deriveBtcAddress(validBtcRoot, 0)).resolves.toBeDefined();
    await expect(deriveSolAddress(validSolRoot, 0)).resolves.toBeDefined();
  });

  it('all chains accept large valid indices', async () => {
    await expect(deriveEthAddress(validEthRoot, 1000000)).resolves.toBeDefined();
    await expect(deriveBtcAddress(validBtcRoot, 1000000)).resolves.toBeDefined();
    await expect(deriveSolAddress(validSolRoot, 1000000)).resolves.toBeDefined();
  });

  it('all chains reject exactly the same invalid inputs', async () => {
    // Invalid root length
    await expect(deriveEthAddress(new Uint8Array(31), 0)).rejects.toThrow('must be 32 bytes');
    await expect(deriveBtcAddress(new Uint8Array(31), 0)).rejects.toThrow('must be 32 bytes');
    await expect(deriveSolAddress(new Uint8Array(31), 0)).rejects.toThrow('must be 32 bytes');

    // Negative index
    await expect(deriveEthAddress(validEthRoot, -1)).rejects.toThrow('non-negative integer');
    await expect(deriveBtcAddress(validBtcRoot, -1)).rejects.toThrow('non-negative integer');
    await expect(deriveSolAddress(validSolRoot, -1)).rejects.toThrow('non-negative integer');

    // Non-integer index
    await expect(deriveEthAddress(validEthRoot, 1.5)).rejects.toThrow('non-negative integer');
    await expect(deriveBtcAddress(validBtcRoot, 1.5)).rejects.toThrow('non-negative integer');
    await expect(deriveSolAddress(validSolRoot, 1.5)).rejects.toThrow('non-negative integer');
  });
});
