import { describe, it, expect } from 'vitest'
import { NwcConnector } from '../src/nwc.js'
import { UnsupportedFeatureError, ValidationError } from '../src/errors.js'

describe('NwcConnector', () => {
  it('connects via URI and returns pubkey as address; disconnects', async () => {
    const nwc = new NwcConnector()
    const pk = 'a'.repeat(64)
    const uri = `nostr+walletconnect://${pk}?relay=wss://relay.example.org&cap=pay_invoice&budget=1000`
    await nwc.connect({ uri })
    expect(nwc.isConnected()).toBe(true)
    const addr = await nwc.getAddress()
    expect(addr).toBe(pk)
    await nwc.disconnect()
    expect(nwc.isConnected()).toBe(false)
  })

  it('rejects invalid URIs and unsupported signMessage', async () => {
    const nwc = new NwcConnector()
    await expect(nwc.connect({ uri: 'invalid://foo' } as any)).rejects.toThrow(ValidationError)

    // connect minimal session
    await nwc.connect({ session: { pubkey: 'abc', relays: [] } as any })
    await expect(nwc.signMessage(new Uint8Array([1]))).rejects.toBeInstanceOf(UnsupportedFeatureError)
  })
})
