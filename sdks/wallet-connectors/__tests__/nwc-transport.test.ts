import { describe, it, expect } from 'vitest'
import { NwcConnector } from '../src/nwc.js'
import type { NwcRelay, NwcRequestEnvelope, NwcResponseEnvelope } from '../src/types.js'
import { UnsupportedFeatureError, ValidationError } from '../src/errors.js'
import { encryptNip44, decryptNip44, derivePublicKey, generatePrivateKey } from '../src/nip44.js'

class MockRelay implements NwcRelay {
  private subs: Record<string, ((m: string) => void)[]> = {}
  publish(topic: string, message: string): Promise<void> {
    setTimeout(() => {
      ;(this.subs[topic] || []).forEach((h) => h(message))
    }, 0)
    return Promise.resolve()
  }
  subscribe(topic: string, handler: (message: string) => void): () => void {
    this.subs[topic] ||= []
    this.subs[topic].push(handler)
    return () => {
      this.subs[topic] = (this.subs[topic] || []).filter((h) => h !== handler)
    }
  }
}

describe('NwcConnector transport with NIP-44 encryption', () => {
  it('round-trip success with encrypted messages', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()

    // Setup: client and wallet keypairs
    const clientSecret = generatePrivateKey()
    const walletSecret = generatePrivateKey()
    const clientPubkey = derivePublicKey(clientSecret)
    const walletPubkey = derivePublicKey(walletSecret)

    await nwc.connect({ session: { walletPubkey, clientSecret, relays: [] } })
    nwc.setRelay(relay)

    // Wallet-side responder: decrypt request, encrypt response
    relay.subscribe(`req/${clientPubkey}`, (encryptedMsg: string) => {
      const decrypted = decryptNip44(encryptedMsg, walletSecret, clientPubkey)
      const req: NwcRequestEnvelope = JSON.parse(decrypted)
      const res: NwcResponseEnvelope = { id: req.id, result: { ok: true } }
      const encryptedRes = encryptNip44(JSON.stringify(res), walletSecret, clientPubkey)
      relay.publish(`res/${clientPubkey}`, encryptedRes)
    })

    const res = await nwc.sendRequest('get_info', {})
    expect(res.ok).toBe(true)
  })

  it('timeout error', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()
    const clientSecret = generatePrivateKey()
    const walletPubkey = derivePublicKey(generatePrivateKey())

    await nwc.connect({ session: { walletPubkey, clientSecret, relays: [] } })
    nwc.setRelay(relay)

    await expect(nwc.sendRequest('get_info', {}, 10)).rejects.toThrow(/timed out/)
  })

  it('response error mapping', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()

    const clientSecret = generatePrivateKey()
    const walletSecret = generatePrivateKey()
    const clientPubkey = derivePublicKey(clientSecret)
    const walletPubkey = derivePublicKey(walletSecret)

    await nwc.connect({ session: { walletPubkey, clientSecret, relays: [] } })
    nwc.setRelay(relay)

    relay.subscribe(`req/${clientPubkey}`, (encryptedMsg: string) => {
      const decrypted = decryptNip44(encryptedMsg, walletSecret, clientPubkey)
      const req: NwcRequestEnvelope = JSON.parse(decrypted)
      const res: NwcResponseEnvelope = { id: req.id, error: { code: 400, message: 'bad request' } }
      const encryptedRes = encryptNip44(JSON.stringify(res), walletSecret, clientPubkey)
      relay.publish(`res/${clientPubkey}`, encryptedRes)
    })

    await expect(nwc.sendRequest('get_info', {})).rejects.toThrow(/NWC error 400/)
  })

  it('enforces capabilities (rejects ungranted method)', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()
    const clientSecret = generatePrivateKey()
    const walletPubkey = derivePublicKey(generatePrivateKey())

    await nwc.connect({ session: { walletPubkey, clientSecret, relays: [], caps: ['get_info'] } })
    nwc.setRelay(relay)
    await expect(nwc.sendRequest('pay_invoice', { amountSats: 1 })).rejects.toBeInstanceOf(UnsupportedFeatureError)
  })

  it('enforces budget and decrements on success', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()

    const clientSecret = generatePrivateKey()
    const walletSecret = generatePrivateKey()
    const clientPubkey = derivePublicKey(clientSecret)
    const walletPubkey = derivePublicKey(walletSecret)

    await nwc.connect({ session: { walletPubkey, clientSecret, relays: [], caps: ['pay_invoice'], budgetSats: 150 } })
    nwc.setRelay(relay)

    // Wallet responder always success
    relay.subscribe(`req/${clientPubkey}`, (encryptedMsg: string) => {
      const decrypted = decryptNip44(encryptedMsg, walletSecret, clientPubkey)
      const req: NwcRequestEnvelope = JSON.parse(decrypted)
      const res: NwcResponseEnvelope = { id: req.id, result: { paid: true } }
      const encryptedRes = encryptNip44(JSON.stringify(res), walletSecret, clientPubkey)
      relay.publish(`res/${clientPubkey}`, encryptedRes)
    })

    // invalid amount
    await expect(nwc.sendRequest('pay_invoice', { amountSats: 0 })).rejects.toBeInstanceOf(ValidationError)

    // first spend 100 ok
    const r1 = await nwc.sendRequest('pay_invoice', { amountSats: 100 })
    expect(r1.paid).toBe(true)

    // now remaining budget is 50; try to spend 60 should fail
    await expect(nwc.sendRequest('pay_invoice', { amountSats: 60 })).rejects.toThrow(/exceeds session budget/)
  })
})
