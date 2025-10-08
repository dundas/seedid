import { describe, it, expect } from 'vitest';
import { deriveWalletRoot, forEthRoot, forBtcRoot, forSolRoot } from '../src/index';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const start = i * 2;
    bytes[i] = parseInt(clean.substring(start, start + 2), 16);
  }
  return bytes;
}

function bytesToHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readFixture(name: string): Promise<any> {
  const p = path.resolve(__dirname, '../fixtures', name);
  const content = await fs.readFile(p, 'utf8');
  return JSON.parse(content);
}

describe('@seedid/wallets root derivation', () => {
  it('ETH root matches fixture', async () => {
    const fx = await readFixture('wallet_eth.json');
    const master = hexToBytes(fx.kdf.master_hex);
    const root = await deriveWalletRoot(master, 'eth');
    expect(bytesToHex(root)).toBe(fx.hkdf_root_hex);
  });

  it('BTC root matches fixture', async () => {
    const fx = await readFixture('wallet_btc.json');
    const master = hexToBytes(fx.kdf.master_hex);
    const root = await deriveWalletRoot(master, 'btc');
    expect(bytesToHex(root)).toBe(fx.hkdf_root_hex);
  });

  it('SOL root matches fixture', async () => {
    const fx = await readFixture('wallet_sol.json');
    const master = hexToBytes(fx.kdf.master_hex);
    const root = await deriveWalletRoot(master, 'sol');
    expect(bytesToHex(root)).toBe(fx.hkdf_root_hex);
  });

  it('convenience wrappers equal deriveWalletRoot', async () => {
    const fxEth = await readFixture('wallet_eth.json');
    const master = hexToBytes(fxEth.kdf.master_hex);
    const [a, b] = await Promise.all([deriveWalletRoot(master, 'eth'), forEthRoot(master)]);
    expect(bytesToHex(a)).toBe(bytesToHex(b));

    const fxBtc = await readFixture('wallet_btc.json');
    const masterB = hexToBytes(fxBtc.kdf.master_hex);
    const [c, d] = await Promise.all([deriveWalletRoot(masterB, 'btc'), forBtcRoot(masterB)]);
    expect(bytesToHex(c)).toBe(bytesToHex(d));

    const fxSol = await readFixture('wallet_sol.json');
    const masterS = hexToBytes(fxSol.kdf.master_hex);
    const [e, f] = await Promise.all([deriveWalletRoot(masterS, 'sol'), forSolRoot(masterS)]);
    expect(bytesToHex(e)).toBe(bytesToHex(f));
  });

  it('validation: rejects wrong master length and unsupported chain', async () => {
    const bad = new Uint8Array(16);
    await expect(deriveWalletRoot(bad as any, 'eth')).rejects.toThrow();
    // @ts-expect-error invalid chain
    await expect(deriveWalletRoot(new Uint8Array(32), 'doge')).rejects.toThrow();
  });
});
