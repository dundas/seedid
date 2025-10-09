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

describe('NwcConnector concurrent budget tests', () => {
  it('prevents budget overspend with concurrent pay_invoice requests', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()

    const clientSecret = generatePrivateKey()
    const walletSecret = generatePrivateKey()
    const clientPubkey = derivePublicKey(clientSecret)
    const walletPubkey = derivePublicKey(walletSecret)

    // Session with 150 sats budget
    await nwc.connect({
      session: { walletPubkey, clientSecret, relays: [], caps: ['pay_invoice'], budgetSats: 150 }
    })
    nwc.setRelay(relay)

    // Wallet responder that always succeeds
    relay.subscribe(`req/${clientPubkey}`, (encryptedMsg: string) => {
      const decrypted = decryptNip44(encryptedMsg, walletSecret, clientPubkey)
      const req: NwcRequestEnvelope = JSON.parse(decrypted)
      const res: NwcResponseEnvelope = { id: req.id, result: { preimage: 'abc123', fees_paid: 1 } }
      const encryptedRes = encryptNip44(JSON.stringify(res), walletSecret, clientPubkey)
      relay.publish(`res/${clientPubkey}`, encryptedRes)
    })

    // Launch 3 concurrent requests that would overspend if not atomic
    // Request 1: 100 sats (should succeed, budget: 150 -> 50)
    // Request 2: 100 sats (should fail, 100 > 50)
    // Request 3: 40 sats  (should succeed, budget: 50 -> 10)

    const results = await Promise.allSettled([
      nwc.payInvoice('lnbc100n1...', 100), // 100 sats
      nwc.payInvoice('lnbc100n2...', 100), // 100 sats
      nwc.payInvoice('lnbc40n1...', 40)     // 40 sats
    ])

    // Verify results
    const succeeded = results.filter(r => r.status === 'fulfilled')
    const failed = results.filter(r => r.status === 'rejected')

    // Exactly 2 should succeed (100 + 40 = 140 <= 150)
    expect(succeeded.length).toBe(2)
    expect(failed.length).toBe(1)

    // Verify failure is due to budget
    const rejection = failed[0] as PromiseRejectedResult
    expect(rejection.reason).toBeInstanceOf(ValidationError)
    expect(rejection.reason.message).toMatch(/exceeds.*budget/i)
  })

  it('refunds budget when payment fails', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()

    const clientSecret = generatePrivateKey()
    const walletSecret = generatePrivateKey()
    const clientPubkey = derivePublicKey(clientSecret)
    const walletPubkey = derivePublicKey(walletSecret)

    await nwc.connect({
      session: { walletPubkey, clientSecret, relays: [], caps: ['pay_invoice'], budgetSats: 200 }
    })
    nwc.setRelay(relay)

    let requestCount = 0

    // Wallet responder that fails first payment, succeeds second
    relay.subscribe(`req/${clientPubkey}`, (encryptedMsg: string) => {
      const decrypted = decryptNip44(encryptedMsg, walletSecret, clientPubkey)
      const req: NwcRequestEnvelope = JSON.parse(decrypted)

      requestCount++
      let res: NwcResponseEnvelope

      if (requestCount === 1) {
        // First payment fails
        res = {
          id: req.id,
          error: { code: 'PAYMENT_FAILED', message: 'Insufficient balance' }
        }
      } else {
        // Second payment succeeds
        res = { id: req.id, result: { preimage: 'xyz789', fees_paid: 1 } }
      }

      const encryptedRes = encryptNip44(JSON.stringify(res), walletSecret, clientPubkey)
      relay.publish(`res/${clientPubkey}`, encryptedRes)
    })

    // Try to pay 100 sats - should fail and refund
    await expect(nwc.payInvoice('lnbc100n1...', 100)).rejects.toThrow(/PAYMENT_FAILED/)

    // Budget should be refunded back to 200
    // Try another payment - should succeed if budget was refunded
    const result = await nwc.payInvoice('lnbc100n2...', 100)
    expect(result.preimage).toBe('xyz789')
  })

  it('refunds budget on timeout', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()

    const clientSecret = generatePrivateKey()
    const walletSecret = generatePrivateKey()
    const clientPubkey = derivePublicKey(clientSecret)
    const walletPubkey = derivePublicKey(walletSecret)

    await nwc.connect({
      session: { walletPubkey, clientSecret, relays: [], caps: ['pay_invoice'], budgetSats: 100 }
    })
    nwc.setRelay(relay)

    // No wallet responder initially - request will timeout

    // Try to pay 50 sats with very short timeout
    await expect(
      nwc.sendRequest('pay_invoice', { amountSats: 50 }, 10)
    ).rejects.toThrow(/timed out/)

    // Budget should be refunded back to 100
    // Set up responder now for second attempt
    relay.subscribe(`req/${clientPubkey}`, (encryptedMsg: string) => {
      const decrypted = decryptNip44(encryptedMsg, walletSecret, clientPubkey)
      const req: NwcRequestEnvelope = JSON.parse(decrypted)
      const res: NwcResponseEnvelope = { id: req.id, result: { preimage: 'refund123', fees_paid: 1 } }
      const encryptedRes = encryptNip44(JSON.stringify(res), walletSecret, clientPubkey)
      relay.publish(`res/${clientPubkey}`, encryptedRes)
    })

    // This should succeed if budget was refunded (100 sats available)
    const result = await nwc.payInvoice('lnbc100n2...', 100)
    expect(result.preimage).toBe('refund123')
  })
})
