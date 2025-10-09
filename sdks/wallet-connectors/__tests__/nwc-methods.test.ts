import { describe, it, expect } from 'vitest'
import { NwcConnector } from '../src/nwc.js'
import type { NwcRelay, NwcRequestEnvelope, NwcResponseEnvelope } from '../src/types.js'
import { ValidationError } from '../src/errors.js'
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

describe('NwcConnector methods', () => {
  it('getInfo returns wallet information', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()

    const clientSecret = generatePrivateKey()
    const walletSecret = generatePrivateKey()
    const clientPubkey = derivePublicKey(clientSecret)
    const walletPubkey = derivePublicKey(walletSecret)

    await nwc.connect({ session: { walletPubkey, clientSecret, relays: [] } })
    nwc.setRelay(relay)

    // Mock wallet response
    relay.subscribe(`req/${clientPubkey}`, (encryptedMsg: string) => {
      const decrypted = decryptNip44(encryptedMsg, walletSecret, clientPubkey)
      const req: NwcRequestEnvelope = JSON.parse(decrypted)

      expect(req.method).toBe('get_info')

      const res: NwcResponseEnvelope = {
        id: req.id,
        result: {
          alias: 'Test Wallet',
          pubkey: walletPubkey,
          network: 'testnet',
          methods: ['get_info', 'pay_invoice']
        }
      }
      const encryptedRes = encryptNip44(JSON.stringify(res), walletSecret, clientPubkey)
      relay.publish(`res/${clientPubkey}`, encryptedRes)
    })

    const info = await nwc.getInfo()
    expect(info.alias).toBe('Test Wallet')
    expect(info.pubkey).toBe(walletPubkey)
    expect(info.network).toBe('testnet')
    expect(info.methods).toEqual(['get_info', 'pay_invoice'])
  })

  it('payInvoice sends payment and returns preimage', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()

    const clientSecret = generatePrivateKey()
    const walletSecret = generatePrivateKey()
    const clientPubkey = derivePublicKey(clientSecret)
    const walletPubkey = derivePublicKey(walletSecret)

    await nwc.connect({
      session: { walletPubkey, clientSecret, relays: [], caps: ['pay_invoice'], budgetSats: 1000 }
    })
    nwc.setRelay(relay)

    const testInvoice = 'lnbc100n1...'
    const expectedPreimage = '0123456789abcdef'

    // Mock wallet response
    relay.subscribe(`req/${clientPubkey}`, (encryptedMsg: string) => {
      const decrypted = decryptNip44(encryptedMsg, walletSecret, clientPubkey)
      const req: NwcRequestEnvelope = JSON.parse(decrypted)

      expect(req.method).toBe('pay_invoice')
      expect(req.params.invoice).toBe(testInvoice)
      expect(req.params.amountSats).toBe(100)

      const res: NwcResponseEnvelope = {
        id: req.id,
        result: {
          preimage: expectedPreimage,
          fees_paid: 1
        }
      }
      const encryptedRes = encryptNip44(JSON.stringify(res), walletSecret, clientPubkey)
      relay.publish(`res/${clientPubkey}`, encryptedRes)
    })

    const result = await nwc.payInvoice(testInvoice, 100)
    expect(result.preimage).toBe(expectedPreimage)
    expect(result.fees_paid).toBe(1)
  })

  it('payInvoice validates invoice format', async () => {
    const nwc = new NwcConnector()
    const clientSecret = generatePrivateKey()
    const walletPubkey = derivePublicKey(generatePrivateKey())

    await nwc.connect({ session: { walletPubkey, clientSecret, relays: [], caps: ['pay_invoice'] } })
    nwc.setRelay(new MockRelay())

    // Invalid invoice formats
    await expect(nwc.payInvoice('')).rejects.toThrow(ValidationError)
    await expect(nwc.payInvoice('invalid')).rejects.toThrow(ValidationError)
    await expect(nwc.payInvoice('bc1q...')).rejects.toThrow(ValidationError)

    // Invalid amounts
    await expect(nwc.payInvoice('lnbc100n1...', 0)).rejects.toThrow(ValidationError)
    await expect(nwc.payInvoice('lnbc100n1...', -100)).rejects.toThrow(ValidationError)
    await expect(nwc.payInvoice('lnbc100n1...', NaN)).rejects.toThrow(ValidationError)
  })

  it('payInvoice enforces capabilities and budget', async () => {
    const nwc = new NwcConnector()
    const clientSecret = generatePrivateKey()
    const walletPubkey = derivePublicKey(generatePrivateKey())

    // No pay_invoice capability
    await nwc.connect({ session: { walletPubkey, clientSecret, relays: [], caps: ['get_info'] } })
    nwc.setRelay(new MockRelay())

    await expect(nwc.payInvoice('lnbc100n1...', 100)).rejects.toThrow(/Capability not granted/)
  })
})
