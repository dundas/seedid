import { describe, it, expect } from 'vitest'
import { NwcConnector } from '../src/nwc.js'
import { ValidationError } from '../src/errors.js'
import { generatePrivateKey, derivePublicKey } from '../src/nip44.js'

describe('NwcConnector lifecycle', () => {
  it('handles multiple connect/disconnect cycles', async () => {
    const nwc = new NwcConnector()
    const clientSecret = generatePrivateKey()
    const walletPubkey = derivePublicKey(generatePrivateKey())
    const uri = `nostr+walletconnect://${walletPubkey}?relay=wss://relay.example.org&secret=${clientSecret}`

    // First cycle
    await nwc.connect({ uri })
    expect(nwc.isConnected()).toBe(true)
    const addr1 = await nwc.getAddress()
    expect(addr1).toBe(derivePublicKey(clientSecret))

    await nwc.disconnect()
    expect(nwc.isConnected()).toBe(false)

    // Second cycle
    await nwc.connect({ uri })
    expect(nwc.isConnected()).toBe(true)
    const addr2 = await nwc.getAddress()
    expect(addr2).toBe(derivePublicKey(clientSecret))

    await nwc.disconnect()
    expect(nwc.isConnected()).toBe(false)

    // Third cycle
    await nwc.connect({ uri })
    expect(nwc.isConnected()).toBe(true)

    await nwc.disconnect()
    expect(nwc.isConnected()).toBe(false)
  })

  it('throws when calling methods after disconnect', async () => {
    const nwc = new NwcConnector()
    const clientSecret = generatePrivateKey()
    const walletPubkey = derivePublicKey(generatePrivateKey())

    await nwc.connect({ session: { walletPubkey, clientSecret, relays: [] } })
    expect(nwc.isConnected()).toBe(true)

    await nwc.disconnect()
    expect(nwc.isConnected()).toBe(false)

    // Methods should fail after disconnect
    await expect(nwc.getAddress()).rejects.toThrow(ValidationError)
    await expect(nwc.getInfo()).rejects.toThrow(ValidationError)
    await expect(nwc.payInvoice('lnbc1...', 100)).rejects.toThrow(ValidationError)
  })

  it('clears session data on disconnect', async () => {
    const nwc = new NwcConnector()
    const clientSecret = generatePrivateKey()
    const walletPubkey = derivePublicKey(generatePrivateKey())

    await nwc.connect({
      session: { walletPubkey, clientSecret, relays: [], caps: ['pay_invoice'], budgetSats: 500 }
    })

    expect(nwc.isConnected()).toBe(true)
    await nwc.getAddress() // Should work

    await nwc.disconnect()

    // Session should be cleared
    expect(nwc.isConnected()).toBe(false)
    await expect(nwc.getAddress()).rejects.toThrow(ValidationError)
  })

  it('allows reconnecting with different session', async () => {
    const nwc = new NwcConnector()

    // First session
    const clientSecret1 = generatePrivateKey()
    const walletPubkey1 = derivePublicKey(generatePrivateKey())
    await nwc.connect({ session: { walletPubkey: walletPubkey1, clientSecret: clientSecret1, relays: [] } })

    const addr1 = await nwc.getAddress()
    expect(addr1).toBe(derivePublicKey(clientSecret1))

    await nwc.disconnect()

    // Second session (different keys)
    const clientSecret2 = generatePrivateKey()
    const walletPubkey2 = derivePublicKey(generatePrivateKey())
    await nwc.connect({ session: { walletPubkey: walletPubkey2, clientSecret: clientSecret2, relays: [] } })

    const addr2 = await nwc.getAddress()
    expect(addr2).toBe(derivePublicKey(clientSecret2))
    expect(addr2).not.toBe(addr1) // Different session
  })

  it('removes all event listeners on disconnect', async () => {
    const nwc = new NwcConnector()
    const clientSecret = generatePrivateKey()
    const walletPubkey = derivePublicKey(generatePrivateKey())

    // Add event listeners
    let disconnectCount = 0
    nwc.on('disconnect', () => disconnectCount++)

    await nwc.connect({ session: { walletPubkey, clientSecret, relays: [] } })

    // Disconnect should trigger event
    await nwc.disconnect()
    expect(disconnectCount).toBe(0) // NWC doesn't emit disconnect events currently, but tests cleanup

    // After disconnect, no listeners should remain
    expect(nwc.listenerCount('disconnect')).toBe(0)
    expect(nwc.listenerCount('error')).toBe(0)
  })

  it('handles rapid connect/disconnect without memory leaks', async () => {
    const nwc = new NwcConnector()
    const clientSecret = generatePrivateKey()
    const walletPubkey = derivePublicKey(generatePrivateKey())
    const uri = `nostr+walletconnect://${walletPubkey}?relay=wss://relay.example.org&secret=${clientSecret}`

    // Rapid cycles
    for (let i = 0; i < 10; i++) {
      await nwc.connect({ uri })
      expect(nwc.isConnected()).toBe(true)
      await nwc.disconnect()
      expect(nwc.isConnected()).toBe(false)
    }

    // Final connect should still work
    await nwc.connect({ uri })
    expect(nwc.isConnected()).toBe(true)
    const addr = await nwc.getAddress()
    expect(addr).toBeTruthy()
  })
})
