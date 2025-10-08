import { describe, it, expect } from 'vitest'
import { deriveSolAddressSlip10 } from '../src/sol_slip10.js'

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '')
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    const start = i * 2
    bytes[i] = parseInt(clean.substring(start, start + 2), 16)
  }
  return bytes
}

describe('SOL SLIP-10 derivation', () => {
  const solRoot = hexToBytes('7ab3ecb36fcd5cad7b16f650e46da3acbc2eb8f022bac1a0322f97797d5568a0')

  it('phantom preset deterministic for indices 0 and 1', async () => {
    const a0 = await deriveSolAddressSlip10(solRoot, { preset: 'phantom', index: 0 })
    const a0b = await deriveSolAddressSlip10(solRoot, { preset: 'phantom', index: 0 })
    const a1 = await deriveSolAddressSlip10(solRoot, { preset: 'phantom', index: 1 })

    expect(a0.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
    expect(a0.address).toBe(a0b.address)
    expect(a0.address).not.toBe(a1.address)
  })

  it('solflare preset differs from phantom at same index', async () => {
    const p0 = await deriveSolAddressSlip10(solRoot, { preset: 'phantom', index: 0 })
    const s0 = await deriveSolAddressSlip10(solRoot, { preset: 'solflare', index: 0 })
    expect(p0.address).not.toBe(s0.address)
  })

  it('invalid path (non-hardened) throws for custom', async () => {
    await expect(
      deriveSolAddressSlip10(solRoot, { preset: 'custom', path: "m/44/501/0/0" })
    ).rejects.toThrow()
  })

  it('invalid root length and negative index throw', async () => {
    const badRoot = new Uint8Array(16)
    await expect(deriveSolAddressSlip10(badRoot as any, { preset: 'phantom', index: 0 })).rejects.toThrow()
    await expect(deriveSolAddressSlip10(solRoot, { preset: 'phantom', index: -1 as any })).rejects.toThrow()
  })
})
