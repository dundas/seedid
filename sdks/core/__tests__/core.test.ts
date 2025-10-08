import { describe, it, expect } from 'vitest';
import { hkdf, normalizePassphrase, forNostr, forDidKey, forWallet, LABEL_NOSTR_KEY, LABEL_WALLET_ETH, LABEL_WALLET_BTC, LABEL_WALLET_SOL, LABEL_DID_KEY_ED25519, LABEL_DID_KEY_SECP256K1, HKDF_SALT, deriveMasterKey } from '../src/index';
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
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readFixture(name: string): Promise<any> {
  const p = path.resolve(__dirname, '../fixtures', name);
  const content = await fs.readFile(p, 'utf8');
  return JSON.parse(content);
}

describe('@seedid/core hkdf + helpers (submodule)', () => {
  it('argon2id end-to-end derives expected master key (default params)', async () => {
    const passphrase = 'example:correct horse battery staple';
    const out = await deriveMasterKey(passphrase, { algorithm: 'argon2id' });
    expect(bytesToHex(out)).toBe('a4c8801bc4694b78afe54d013f947edd62075e391aa90509494781ae6eeadae4');
  });
  it('normalizes passphrase per spec', () => {
    expect(normalizePassphrase('  Hello WORLD  ')).toBe('hello world');
    // NFKD example: composed À becomes decomposed a + combining grave
    const expected = 'a\u0300 la carte';
    expect(normalizePassphrase('\u00C0 la carte')).toBe(expected);
  });

  it('hkdf root matches nostr fixture', async () => {
    const fx = await readFixture('nostr.json');
    const master = hexToBytes(fx.kdf.master_hex);
    const out = await hkdf(master, fx.hkdf_info, { salt: HKDF_SALT, length: 32 });
    expect(bytesToHex(out)).toBe(fx.hkdf_root_hex);
  });

  it('hkdf root matches wallet ETH fixture', async () => {
    const fx = await readFixture('wallet_eth.json');
    const master = hexToBytes(fx.kdf.master_hex);
    const out = await hkdf(master, fx.hkdf_info, { salt: HKDF_SALT, length: 32 });
    expect(bytesToHex(out)).toBe(fx.hkdf_root_hex);
  });

  it('hkdf root matches wallet BTC fixture', async () => {
    const fx = await readFixture('wallet_btc.json');
    const master = hexToBytes(fx.kdf.master_hex);
    const out = await hkdf(master, fx.hkdf_info, { salt: HKDF_SALT, length: 32 });
    expect(bytesToHex(out)).toBe(fx.hkdf_root_hex);
  });

  it('hkdf root matches wallet SOL fixture', async () => {
    const fx = await readFixture('wallet_sol.json');
    const master = hexToBytes(fx.kdf.master_hex);
    const out = await hkdf(master, fx.hkdf_info, { salt: HKDF_SALT, length: 32 });
    expect(bytesToHex(out)).toBe(fx.hkdf_root_hex);
  });

  it('hkdf root matches did:key ed25519 fixture', async () => {
    const fx = await readFixture('didkey_ed25519.json');
    const master = hexToBytes(fx.kdf.master_hex);
    const out = await hkdf(master, fx.hkdf_info, { salt: HKDF_SALT, length: 32 });
    expect(bytesToHex(out)).toBe(fx.hkdf_root_hex);
  });

  it('hkdf root matches did:key secp256k1 fixture', async () => {
    const fx = await readFixture('didkey_secp256k1.json');
    const master = hexToBytes(fx.kdf.master_hex);
    const out = await hkdf(master, fx.hkdf_info, { salt: HKDF_SALT, length: 32 });
    expect(bytesToHex(out)).toBe(fx.hkdf_root_hex);
  });

  it('helpers map to the same HKDF roots', async () => {
    const master = hexToBytes('da3a8b971ae662e7685cf28c5352009c1bc694e84c871800e46fc87b1a9ffe82');
    const [nostrA, nostrB] = await Promise.all([
      hkdf(master, LABEL_NOSTR_KEY, { salt: HKDF_SALT, length: 32 }),
      forNostr(master),
    ]);
    expect(bytesToHex(nostrA)).toBe(bytesToHex(nostrB));

    const [didEdA, didEdB] = await Promise.all([
      hkdf(master, LABEL_DID_KEY_ED25519, { salt: HKDF_SALT, length: 32 }),
      forDidKey(master, 'ed25519'),
    ]);
    expect(bytesToHex(didEdA)).toBe(bytesToHex(didEdB));

    const [ethA, ethB] = await Promise.all([
      hkdf(master, LABEL_WALLET_ETH, { salt: HKDF_SALT, length: 32 }),
      forWallet(master, 'eth'),
    ]);
    expect(bytesToHex(ethA)).toBe(bytesToHex(ethB));

    const [btcA, btcB] = await Promise.all([
      hkdf(master, LABEL_WALLET_BTC, { salt: HKDF_SALT, length: 32 }),
      forWallet(master, 'btc'),
    ]);
    expect(bytesToHex(btcA)).toBe(bytesToHex(btcB));

    const [solA, solB] = await Promise.all([
      hkdf(master, LABEL_WALLET_SOL, { salt: HKDF_SALT, length: 32 }),
      forWallet(master, 'sol'),
    ]);
    expect(bytesToHex(solA)).toBe(bytesToHex(solB));
  });

  it('hkdf invalid lengths throw (0 and > 8160)', async () => {
    const master = hexToBytes('da3a8b971ae662e7685cf28c5352009c1bc694e84c871800e46fc87b1a9ffe82');
    await expect(hkdf(master, LABEL_NOSTR_KEY, { salt: HKDF_SALT, length: 0 })).rejects.toThrow();
    await expect(hkdf(master, LABEL_NOSTR_KEY, { salt: HKDF_SALT, length: 8161 })).rejects.toThrow();
  });

  it('deriveMasterKey rejects unsupported algorithm', async () => {
    // @ts-expect-error: deliberate invalid algorithm to test error path
    await expect(deriveMasterKey('x', { algorithm: 'unknown' })).rejects.toThrow();
  });
});
