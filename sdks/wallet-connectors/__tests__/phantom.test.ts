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
        on: (_evt: string, _cb: Function) => {},
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
})
