import { hmac } from '@noble/hashes/hmac.js'
import { sha512 } from '@noble/hashes/sha2.js'

// Hardened index constant
const HARDENED = 0x80000000

// HMAC-SHA512 helper
function hmacSha512(key: Uint8Array, data: Uint8Array): Uint8Array {
  return hmac(sha512, key, data)
}

export function parseSlip10Path(path: string): number[] {
  if (typeof path !== 'string' || path.length === 0) throw new Error('path must be non-empty string')
  if (!path.startsWith('m/')) throw new Error('path must start with "m/"')
  const segments = path.slice(2).split('/')
  if (segments.length === 0) return []
  const out: number[] = []
  for (const seg of segments) {
    if (!seg.endsWith("'")) throw new Error('ed25519 only supports hardened segments (must end with \"\'\")')
    const numStr = seg.slice(0, -1)
    if (!/^[0-9]+$/.test(numStr)) throw new Error(`invalid path segment: ${seg}`)
    const num = Number(numStr)
    if (!Number.isInteger(num) || num < 0) throw new Error(`invalid path index: ${seg}`)
    out.push((num | HARDENED) >>> 0)
  }
  return out
}

export function deriveSlip10Ed25519(seed: Uint8Array, path: number[]): { key: Uint8Array; chainCode: Uint8Array } {
  if (!(seed instanceof Uint8Array) || seed.length === 0) throw new Error('seed must be Uint8Array')
  // Master node: I = HMAC-SHA512(key="ed25519 seed", data=seed)
  const masterKey = new TextEncoder().encode('ed25519 seed')
  let I = hmacSha512(masterKey, seed)
  let key = I.slice(0, 32)
  let chainCode = I.slice(32)

  for (const idx of path) {
    // Hardened child only: data = 0x00 || key || ser32(index)
    const data = new Uint8Array(1 + key.length + 4)
    data[0] = 0x00
    data.set(key, 1)
    // ser32 big-endian
    data[1 + key.length + 0] = (idx >>> 24) & 0xff
    data[1 + key.length + 1] = (idx >>> 16) & 0xff
    data[1 + key.length + 2] = (idx >>> 8) & 0xff
    data[1 + key.length + 3] = idx & 0xff
    I = hmacSha512(chainCode, data)
    key = I.slice(0, 32)
    chainCode = I.slice(32)
  }
  return { key, chainCode }
}
