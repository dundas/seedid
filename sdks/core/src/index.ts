import { argon2id } from 'hash-wasm';

export function normalizePassphrase(passphrase: string): string {
  // Unicode NFKD -> lowercase -> trim
  return passphrase.normalize('NFKD').toLowerCase().trim();
}

function textToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  // Use Web Crypto API (available in modern browsers and Node 18+)
  let subtle: any = (globalThis as any)?.crypto?.subtle || (globalThis as any)?.webcrypto?.subtle;
  if (!subtle) {
    try {
      // Node.js 18+: use built-in webcrypto
      const nodeCrypto: any = await import('node:crypto');
      subtle = nodeCrypto?.webcrypto?.subtle;
    } catch {}
  }
  if (!subtle) {
    throw new Error('Web Crypto API not available: cannot compute HMAC-SHA256');
  }
  const cryptoKey = await subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await subtle.sign({ name: 'HMAC' }, cryptoKey, data);
  return new Uint8Array(sig);
}

export async function hkdf(
  ikm: Uint8Array,
  info: Uint8Array | string,
  opts?: { salt?: Uint8Array | string; length?: number }
): Promise<Uint8Array> {
  const salt = opts?.salt ?? 'seedid/v1';
  const length = opts?.length ?? 32;
  // RFC 5869: max output length is 255 * HashLen (SHA-256 => 255 * 32)
  const MAX_LEN = 255 * 32;
  if (length <= 0 || length > MAX_LEN) {
    throw new Error(`Invalid HKDF output length: ${length}. Must be 1..${MAX_LEN}`);
  }
  const infoBytes = typeof info === 'string' ? textToBytes(info) : info;
  const saltBytes = typeof salt === 'string' ? textToBytes(salt) : salt;

  // RFC 5869 HKDF-Extract
  const prk = await hmacSha256(saltBytes, ikm);

  // HKDF-Expand
  let t: Uint8Array = new Uint8Array(0);
  const out = new Uint8Array(length);
  let pos = 0;
  let counter = 1;
  while (pos < length) {
    const input = new Uint8Array(t.length + infoBytes.length + 1);
    input.set(t, 0);
    input.set(infoBytes, t.length);
    input[input.length - 1] = counter;
    t = (await hmacSha256(prk, input)) as unknown as Uint8Array;
    const take = Math.min(t.length, length - pos);
    out.set(t.subarray(0, take), pos);
    pos += take;
    counter++;
  }
  return out;
}

export type KdfParams = {
  algorithm: 'argon2id' | 'scrypt';
  // Algorithm-specific params set by caller. Argon2id handled by consumers.
  params?: Record<string, number | string>;
  salt?: Uint8Array | string;
};

export async function deriveMasterKey(
  _passphrase: string,
  _opts: KdfParams
): Promise<Uint8Array> {
  const passphrase = normalizePassphrase(_passphrase);
  const algo = _opts.algorithm;
  const saltBytes =
    typeof _opts.salt === 'string'
      ? textToBytes(_opts.salt)
      : _opts.salt ?? new Uint8Array(16); // default: 16 zero bytes per spec

  if (algo === 'argon2id') {
    // Defaults per spec if not provided
    const m = Number(_opts.params?.memory_cost ?? _opts.params?.memorySize ?? 262144); // KiB
    const t = Number(_opts.params?.time_cost ?? _opts.params?.iterations ?? 5);
    const p = Number(_opts.params?.parallelism ?? 2);
    const L = Number(_opts.params?.hash_len ?? _opts.params?.hashLength ?? 32);

    const out = await argon2id({
      password: textToBytes(passphrase),
      salt: saltBytes,
      parallelism: p,
      iterations: t,
      memorySize: m,
      hashLength: L,
      outputType: 'binary',
    });
    return out as Uint8Array;
  }

  if (algo === 'scrypt') {
    // Intentionally not implemented in core; reserved for local testing.
    // Implement in a separate adapter if needed to avoid accidental misuse.
    throw new Error('scrypt fallback not implemented. Use Argon2id per SeedID spec.');
  }

  throw new Error(`Unsupported KDF algorithm: ${String(algo)}`);
}

// Helper types for namespace selection
export type DidKeyCurve = 'ed25519' | 'secp256k1';
export type WalletChain = 'eth' | 'btc' | 'sol';

// Convenience helpers to derive HKDF-scoped root material for downstream protocols
export async function forNostr(master: Uint8Array): Promise<Uint8Array> {
  return hkdf(master, LABEL_NOSTR_KEY, { salt: HKDF_SALT, length: 32 });
}

export async function forDidKey(master: Uint8Array, curve: DidKeyCurve): Promise<Uint8Array> {
  const label = curve === 'ed25519' ? LABEL_DID_KEY_ED25519 : LABEL_DID_KEY_SECP256K1;
  return hkdf(master, label, { salt: HKDF_SALT, length: 32 });
}

export async function forWallet(master: Uint8Array, chain: WalletChain): Promise<Uint8Array> {
  switch (chain) {
    case 'eth':
      return hkdf(master, LABEL_WALLET_ETH, { salt: HKDF_SALT, length: 32 });
    case 'btc':
      return hkdf(master, LABEL_WALLET_BTC, { salt: HKDF_SALT, length: 32 });
    case 'sol':
      return hkdf(master, LABEL_WALLET_SOL, { salt: HKDF_SALT, length: 32 });
    default:
      // Exhaustive check for future safety
      throw new Error(`Unsupported wallet chain: ${String(chain)}`);
  }
}

// HKDF canonical labels (see seedid_community/core/namespaces.md)
export const HKDF_SALT = 'seedid/v1' as const;
export const LABEL_NOSTR_KEY = 'seedid/v1/nostr:key' as const;
export const LABEL_DID_KEY_ED25519 = 'seedid/v1/did:key:ed25519' as const;
export const LABEL_DID_KEY_SECP256K1 = 'seedid/v1/did:key:secp256k1' as const;
export const LABEL_WALLET_ETH = 'seedid/v1/wallet:eth' as const;
export const LABEL_WALLET_BTC = 'seedid/v1/wallet:btc' as const;
export const LABEL_WALLET_SOL = 'seedid/v1/wallet:sol' as const;
