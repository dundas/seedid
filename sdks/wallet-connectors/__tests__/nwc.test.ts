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

  it('validates input limits (relay URL, capabilities)', async () => {
    const nwc = new NwcConnector()
    const pk = 'a'.repeat(64)
    const clientSecret = generatePrivateKey()

    // Test: Relay URL exceeds max length (2048)
    const longRelay = 'wss://' + 'a'.repeat(2050)
    const uriLongRelay = `nostr+walletconnect://${pk}?relay=${longRelay}&secret=${clientSecret}`
    await expect(nwc.connect({ uri: uriLongRelay })).rejects.toThrow(/Relay URL exceeds maximum length/)

    // Test: Too many capabilities (> 32)
    const manyCaps = Array.from({ length: 33 }, (_, i) => `cap=get_info`).join('&')
    const uriManyCaps = `nostr+walletconnect://${pk}?relay=wss://relay.example.org&secret=${clientSecret}&${manyCaps}`
    await expect(nwc.connect({ uri: uriManyCaps })).rejects.toThrow(/Number of capabilities exceeds maximum/)

    // Test: Invalid capability name
    const uriInvalidCap = `nostr+walletconnect://${pk}?relay=wss://relay.example.org&secret=${clientSecret}&cap=invalid_method`
    await expect(nwc.connect({ uri: uriInvalidCap })).rejects.toThrow(/Unsupported capability/)

    // Test: Capability name too long (> 64 chars)
    const longCap = 'a'.repeat(65)
    const uriLongCap = `nostr+walletconnect://${pk}?relay=wss://relay.example.org&secret=${clientSecret}&cap=${longCap}`
    await expect(nwc.connect({ uri: uriLongCap })).rejects.toThrow(/Capability name exceeds maximum length/)

    // Test: Valid capability should work
    const uriValid = `nostr+walletconnect://${pk}?relay=wss://relay.example.org&secret=${clientSecret}&cap=pay_invoice`
    await expect(nwc.connect({ uri: uriValid })).resolves.toBeUndefined()
    expect(nwc.isConnected()).toBe(true)
  })
})
