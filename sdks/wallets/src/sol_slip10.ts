import * as ed from '@noble/ed25519'
import bs58 from 'bs58'
import { parseSlip10Path, deriveSlip10Ed25519 } from './slip10.js'

export type SolDerivationPreset = 'phantom' | 'solflare' | 'custom'

export interface SolDerivationOptions {
  index?: number
  preset?: SolDerivationPreset
  path?: string // used only when preset === 'custom'
}

function phantomPath(index: number): string {
  // Common Phantom-compatible path, index hardened
  return `m/44'/501'/${index}'/0'`
}

function solflarePath(index: number): string {
  return `m/44'/501'/${index}'`
}

function buildPath(opts?: SolDerivationOptions): string {
  const index = opts?.index ?? 0
  const preset = opts?.preset ?? 'phantom'
  if (!Number.isInteger(index) || index < 0) throw new Error('index must be a non-negative integer')
  if (preset === 'phantom') return phantomPath(index)
  if (preset === 'solflare') return solflarePath(index)
  if (preset === 'custom') {
    if (!opts?.path) throw new Error('custom preset requires opts.path')
    return opts.path
  }
  throw new Error(`Unsupported preset: ${String(preset)}`)
}

export async function deriveSolAddressSlip10(
  root: Uint8Array,
  opts?: SolDerivationOptions
): Promise<{ address: string; publicKey: Uint8Array }> {
  if (!(root instanceof Uint8Array) || root.length !== 32) throw new Error('SOL root must be 32 bytes')
  const pathStr = buildPath(opts)
  const path = parseSlip10Path(pathStr)
  const { key } = deriveSlip10Ed25519(root, path)
  const publicKey = await ed.getPublicKeyAsync(key)
  const address = bs58.encode(publicKey)
  return { address, publicKey }
}

export async function deriveSolSigningKeySlip10(
  root: Uint8Array,
  opts?: SolDerivationOptions
): Promise<{ privateKey: Uint8Array; publicKey: Uint8Array; address: string }> {
  if (!(root instanceof Uint8Array) || root.length !== 32) throw new Error('SOL root must be 32 bytes')
  const pathStr = buildPath(opts)
  const path = parseSlip10Path(pathStr)
  const { key } = deriveSlip10Ed25519(root, path)
  const publicKey = await ed.getPublicKeyAsync(key)
  const address = bs58.encode(publicKey)
  return { privateKey: key, publicKey, address }
}
