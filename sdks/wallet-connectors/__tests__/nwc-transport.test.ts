import { describe, it, expect } from 'vitest'
import { NwcConnector } from '../src/nwc.js'
import type { NwcRelay, NwcRequestEnvelope, NwcResponseEnvelope } from '../src/types.js'
import { UnsupportedFeatureError, ValidationError } from '../src/errors.js'

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

describe('NwcConnector transport', () => {
  it('round-trip success', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()
    await nwc.connect({ session: { pubkey: 'pk', relays: [] } })
    nwc.setRelay(relay)

    // responder
    relay.subscribe('req/pk', (msg: string) => {
      const req: NwcRequestEnvelope = JSON.parse(msg)
      const res: NwcResponseEnvelope = { id: req.id, result: { ok: true } }
      relay.publish('res/pk', JSON.stringify(res))
    })

    const res = await nwc.sendRequest('get_info', {})
    expect(res.ok).toBe(true)
  })

  it('timeout error', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()
    await nwc.connect({ session: { pubkey: 'pk', relays: [] } })
    nwc.setRelay(relay)

    await expect(nwc.sendRequest('get_info', {}, 10)).rejects.toThrow(/timed out/)
  })

  it('response error mapping', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()
    await nwc.connect({ session: { pubkey: 'pk', relays: [] } })
    nwc.setRelay(relay)

    relay.subscribe('req/pk', (msg: string) => {
      const req: NwcRequestEnvelope = JSON.parse(msg)
      const res: NwcResponseEnvelope = { id: req.id, error: { code: 400, message: 'bad request' } }
      relay.publish('res/pk', JSON.stringify(res))
    })

    await expect(nwc.sendRequest('get_info', {})).rejects.toThrow(/NWC error 400/)
  })

  it('enforces capabilities (rejects ungranted method)', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()
    await nwc.connect({ session: { pubkey: 'pk', relays: [], caps: ['get_info'] } })
    nwc.setRelay(relay)
    await expect(nwc.sendRequest('pay_invoice', { amountSats: 1 })).rejects.toBeInstanceOf(UnsupportedFeatureError)
  })

  it('enforces budget and decrements on success', async () => {
    const relay = new MockRelay()
    const nwc = new NwcConnector()
    await nwc.connect({ session: { pubkey: 'pk', relays: [], caps: ['pay_invoice'], budgetSats: 150 } })
    nwc.setRelay(relay)

    // responder always success
    relay.subscribe('req/pk', (msg: string) => {
      const req: NwcRequestEnvelope = JSON.parse(msg)
      const res: NwcResponseEnvelope = { id: req.id, result: { paid: true } }
      relay.publish('res/pk', JSON.stringify(res))
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
