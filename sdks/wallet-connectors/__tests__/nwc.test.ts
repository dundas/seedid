import { describe, it, expect } from 'vitest'
import { NwcConnector } from '../src/nwc.js'
import { UnsupportedFeatureError, ValidationError } from '../src/errors.js'
import { derivePublicKey, generatePrivateKey } from '../src/nip44.js'

describe('NwcConnector', () => {
  it('connects via URI with secret and returns client pubkey as address; disconnects', async () => {
    const nwc = new NwcConnector()
    const walletPubkey = 'a'.repeat(64)
    const clientSecret = generatePrivateKey()
    const uri = `nostr+walletconnect://${walletPubkey}?relay=wss://relay.example.org&secret=${clientSecret}&cap=pay_invoice&budget=1000`
    await nwc.connect({ uri })
    expect(nwc.isConnected()).toBe(true)

    const addr = await nwc.getAddress()
    const expectedClientPubkey = derivePublicKey(clientSecret)
    expect(addr).toBe(expectedClientPubkey)

    await nwc.disconnect()
    expect(nwc.isConnected()).toBe(false)
  })

  it('rejects invalid URIs (missing secret) and unsupported signMessage', async () => {
    const nwc = new NwcConnector()
    const pk = 'a'.repeat(64)
    const uriNoSecret = `nostr+walletconnect://${pk}?relay=wss://relay.example.org`
    await expect(nwc.connect({ uri: uriNoSecret })).rejects.toThrow(ValidationError)
    await expect(nwc.connect({ uri: 'invalid://foo' })).rejects.toThrow(ValidationError)

    // connect minimal session with required fields
    const clientSecret = generatePrivateKey()
    await nwc.connect({
      session: { walletPubkey: pk, clientSecret, relays: [] }
    })
    await expect(nwc.signMessage(new Uint8Array([1]))).rejects.toBeInstanceOf(UnsupportedFeatureError)
  })
})
