import EventEmitter from 'eventemitter3'
import { WalletProvider, NwcRelay, NwcRequestEnvelope, NwcResponseEnvelope } from './types.js'
import { UnsupportedFeatureError, ValidationError } from './errors.js'

export interface NwcSession {
  pubkey: string
  relays: string[]
  caps?: string[]
  budgetSats?: number
}

export interface NwcOptions {
  uri?: string
  session?: NwcSession
}

function parseNwcUri(uri: string): NwcSession {
  // Minimal parser: nostr+walletconnect://<pubkey>?relay=wss://...&cap=...&budget=...
  if (typeof uri !== 'string' || !uri.startsWith('nostr+walletconnect://'))
    throw new ValidationError('Invalid NWC URI')
  const rest = uri.slice('nostr+walletconnect://'.length)
  const [id, qs] = rest.split('?')
  if (!id || id.length < 8) throw new ValidationError('Invalid NWC pubkey in URI')
  const isHex64 = /^[0-9a-fA-F]{64}$/.test(id)
  const isNpub = id.startsWith('npub') && id.length >= 10
  if (!isHex64 && !isNpub) throw new ValidationError('NWC pubkey must be 64-hex or npub')
  const params = new URLSearchParams(qs || '')
  const relays = params.getAll('relay')
  for (const r of relays) {
    if (!/^wss:\/\//i.test(r)) throw new ValidationError('Relay must use wss:// scheme')
  }
  const caps = params.getAll('cap')
  const budget = params.get('budget')
  const budgetSats = budget ? Number(budget) : undefined
  if (budget && (!Number.isFinite(budgetSats) || budgetSats! < 0)) throw new ValidationError('budget must be a non-negative number')
  return { pubkey: id, relays, caps: caps.length ? caps : undefined, budgetSats }
}

export class NwcConnector extends EventEmitter implements WalletProvider {
  readonly type = 'nwc' as const
  readonly chain = 'lightning' as const
  private connected = false
  private session: NwcSession | null = null
  private relay: NwcRelay | null = null

  isConnected(): boolean {
    return this.connected
  }

  async connect(options?: NwcOptions): Promise<void> {
    const sess = options?.session || (options?.uri ? parseNwcUri(options.uri) : null)
    if (!sess) throw new ValidationError('Missing NWC session or URI')
    if (!Array.isArray(sess.relays) || sess.relays.length === 0) {
      // Allow empty relays in skeleton; future work: require at least one
      sess.relays = []
    }
    this.session = sess
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.session = null
    this.removeAllListeners()
  }

  async getAddress(): Promise<string> {
    if (!this.connected || !this.session?.pubkey) throw new ValidationError('Not connected')
    // Use NWC pubkey as identifier
    return this.session.pubkey
  }

  async signMessage(_message: Uint8Array): Promise<Uint8Array> {
    // Signing is not part of minimal NWC skeleton; use explicit unsupported error
    throw new UnsupportedFeatureError('signMessage not supported by NWC connector (use NWC methods)')
  }

  setRelay(relay: NwcRelay): void {
    this.relay = relay
  }

  async sendRequest(method: string, params: any, timeoutMs = 2000): Promise<any> {
    if (!this.connected || !this.session) throw new ValidationError('Not connected')
    if (!this.relay) throw new UnsupportedFeatureError('No relay configured')
    // capability enforcement
    if (Array.isArray(this.session.caps) && this.session.caps.length > 0) {
      if (!this.session.caps.includes(method)) {
        throw new UnsupportedFeatureError(`Capability not granted for method: ${method}`)
      }
    }
    // budget enforcement for pay_invoice
    let spend = 0
    if (method === 'pay_invoice' && typeof this.session.budgetSats === 'number') {
      const amt = (params && typeof params.amountSats === 'number') ? params.amountSats : NaN
      if (!Number.isFinite(amt) || amt <= 0) throw new ValidationError('pay_invoice requires positive amountSats')
      if (amt > (this.session.budgetSats as number)) throw new ValidationError('Amount exceeds session budget')
      spend = amt
    }
    const reqTopic = `req/${this.session.pubkey}`
    const resTopic = `res/${this.session.pubkey}`
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const envelope: NwcRequestEnvelope = { id, method, params }

    return new Promise<any>((resolve, reject) => {
      let done = false
      const unsubscribe = this.relay!.subscribe(resTopic, (msg: string) => {
        try {
          const res: NwcResponseEnvelope = JSON.parse(msg)
          if (res.id !== id) return
          if (done) return
          done = true
          unsubscribe()
          if (res.error) return reject(new ValidationError(`NWC error ${res.error.code}: ${res.error.message}`))
          // on success, decrement budget if applicable
          if (spend > 0 && typeof this.session!.budgetSats === 'number') {
            this.session!.budgetSats = Math.max(0, (this.session!.budgetSats as number) - spend)
          }
          resolve(res.result)
        } catch (e) {
          // ignore malformed messages for other requests
        }
      })
      const timer = setTimeout(() => {
        if (done) return
        done = true
        unsubscribe()
        reject(new ValidationError('Request timed out'))
      }, timeoutMs)
      this.relay!.publish(reqTopic, JSON.stringify(envelope)).catch((e) => {
        if (done) return
        done = true
        clearTimeout(timer)
        unsubscribe()
        reject(e)
      })
    })
  }
}
