import { normalizePassphrase, deriveMasterKey, forNostr } from '@seedid/core';
import { utils, schnorr } from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';

export type NostrEvent = {
  kind: number;
  content: string;
  created_at: number;
  tags?: string[][];
  pubkey?: string; // 64-hex x-only
  id?: string;     // 64-hex sha256
  sig?: string;    // 64-hex schnorr sig
};

export function bytesToHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const start = i * 2;
    bytes[i] = parseInt(clean.substring(start, start + 2), 16);
  }
  return bytes;
}

export async function deriveNostrRootFromPassphrase(passphrase: string): Promise<Uint8Array> {
  const normalized = normalizePassphrase(passphrase);
  const master = await deriveMasterKey(normalized, { algorithm: 'argon2id' });
  const root = await forNostr(master);
  return root;
}

export async function deriveNostrKeysFromRoot(root: Uint8Array): Promise<{ priv: Uint8Array; pubXOnlyHex: string }>{
  // Deterministically map HKDF root to a valid secp256k1 private key.
  // Try root, else rehash until valid.
  let candidate = new Uint8Array(root);
  for (let i = 0; i < 8; i++) {
    if (utils.isValidPrivateKey(candidate)) break;
    candidate = new Uint8Array(sha256(candidate));
  }
  if (!utils.isValidPrivateKey(candidate)) {
    throw new Error('Unable to derive valid secp256k1 private key from root');
  }
  const pubX = await schnorr.getPublicKey(candidate); // 32-byte x-only
  return { priv: candidate, pubXOnlyHex: bytesToHex(pubX) };
}

export function serializeEventForId(evt: NostrEvent, pubkeyHexXOnly: string): string {
  const tags = evt.tags ?? [];
  const payload: any[] = [0, pubkeyHexXOnly, evt.created_at, evt.kind, tags, evt.content];
  return JSON.stringify(payload);
}

export async function signEventWithPriv(priv: Uint8Array, evt: NostrEvent, pubkeyHexXOnly?: string): Promise<NostrEvent> {
  const pub = pubkeyHexXOnly ?? bytesToHex(await schnorr.getPublicKey(priv));
  const ser = serializeEventForId(evt, pub);
  const id = bytesToHex(sha256(new TextEncoder().encode(ser)));
  const sig = await schnorr.sign(id, priv);
  return { ...evt, pubkey: pub, id, sig: typeof sig === 'string' ? sig : bytesToHex(sig) };
}
