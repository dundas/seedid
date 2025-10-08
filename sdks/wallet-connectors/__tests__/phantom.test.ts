import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PhantomConnector } from '../src/phantom.js'

function setWindow(obj: any) {
  ;(globalThis as any).window = obj
}

describe('PhantomConnector', () => {
  beforeEach(() => {
    const fakePubKey = {
      toBytes: () => new Uint8Array([1,2,3]),
      toString: () => '3w7YtUoR2wF3Xh1b99X9cXzQ9eK6YhXz8qVvYFQ5Q2Qx' // fake base58
    }
    setWindow({
      solana: {
        connect: async () => ({ publicKey: fakePubKey }),
        signMessage: async (msg: Uint8Array, _enc: string) => ({ signature: new Uint8Array([9,9,9]) }),
        signAllTransactions: async (txs: any[]) => txs.map((t) => ({ ...t, signed: true })),
        on: (_evt: string, _cb: Function) => {},
        removeListener: (_evt: string, _cb: Function) => {},
        disconnect: async () => {}
      }
    })
  })

  afterEach(() => {
    setWindow(undefined)
  })

  it('connects and returns address/publicKey; signs message', async () => {
    const ph = new PhantomConnector()
    await ph.connect()
    expect(ph.isConnected()).toBe(true)
    const addr = await ph.getAddress()
    expect(addr.length).toBeGreaterThan(0)
    const pk = await ph.getPublicKey()
    expect(pk).toBeInstanceOf(Uint8Array)

    const sig = await ph.signMessage(new Uint8Array([1,2,3]))
    expect(sig).toBeInstanceOf(Uint8Array)
  })

  it('signAllTransactions and validation', async () => {
    const ph = new PhantomConnector()
    await ph.connect()
    const signed = await ph.signAllTransactions([{ a: 1 }, { b: 2 }])
    expect(Array.isArray(signed)).toBe(true)
    expect(signed[0].signed).toBe(true)
    await expect(ph.signAllTransactions([] as any)).rejects.toThrow(/non-empty array/)
  })

  it('rejects empty message and cleans up listeners on disconnect', async () => {
    const ph = new PhantomConnector()
    await ph.connect()
    await expect(ph.signMessage(new Uint8Array())).rejects.toThrow(/non-empty Uint8Array/)
    // disconnect should clear listeners without throwing
    await ph.disconnect()
    // Triggering events after disconnect should not throw nor affect state
    ;(globalThis as any).window.solana.on('accountChanged', () => {})
  })
})
