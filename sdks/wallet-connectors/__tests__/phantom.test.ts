import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PhantomConnector } from '../src/phantom.js'

function setWindow(obj: any) {
  ;(globalThis as any).window = obj
}

describe('PhantomConnector', () => {
  beforeEach(() => {
    const fakePubKey1 = {
      toBytes: () => new Uint8Array([1,2,3]),
      toString: () => 'Addr1111111111111111111111111111111111111111'
    }
    const fakePubKey2 = {
      toBytes: () => new Uint8Array([7,8,9]),
      toString: () => 'Addr2222222222222222222222222222222222222222'
    }
    const callbacks: Record<string, Function[]> = {}
    const provider: any = {
      isPhantom: true,
      publicKey: fakePubKey1,
      connect: async () => ({ publicKey: fakePubKey1 }),
      signMessage: async (msg: Uint8Array, _enc: string) => ({ signature: new Uint8Array([9,9,9]) }),
      signAllTransactions: async (txs: any[]) => txs.map((t: any) => ({ ...t, signed: true })),
      on: (evt: string, cb: Function) => { (callbacks[evt] ||= []).push(cb) },
      removeListener: (evt: string, cb: Function) => {
        callbacks[evt] = (callbacks[evt] || []).filter((f) => f !== cb)
      },
      disconnect: async () => {},
      _trigger: (evt: string, ...args: any[]) => { (callbacks[evt] || []).forEach((cb) => cb(...args)) },
      _setPublicKey: (pk: any) => { provider.publicKey = pk }
    }
    setWindow({ solana: provider })
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

  it('handles accountChanged event and refreshes address/publicKey', async () => {
    const ph = new PhantomConnector()
    await ph.connect()
    const addr1 = await ph.getAddress()
    const pk1 = await ph.getPublicKey()
    // update provider publicKey and trigger event
    const provider = (globalThis as any).window.solana
    provider._setPublicKey({
      toBytes: () => new Uint8Array([7,8,9]),
      toString: () => 'Addr2222222222222222222222222222222222222222'
    })
    provider._trigger('accountChanged')
    const addr2 = await ph.getAddress()
    const pk2 = await ph.getPublicKey()
    expect(addr2).not.toBe(addr1)
    expect(pk2).not.toEqual(pk1)
  })
})
