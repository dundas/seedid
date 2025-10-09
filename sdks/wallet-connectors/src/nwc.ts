import EventEmitter from 'eventemitter3'
import { WalletProvider, NwcRelay, NwcRequestEnvelope, NwcResponseEnvelope } from './types.js'
import { UnsupportedFeatureError, ValidationError } from './errors.js'
import { encryptNip44, decryptNip44, derivePublicKey } from './nip44.js'

export interface NwcSession {
  walletPubkey: string  // wallet's public key (encryption recipient)
  clientSecret: string  // client's private key (for signing/encrypting)
  relays: string[]
  caps?: string[]
  budgetSats?: number
}

export interface NwcOptions {
  uri?: string
  session?: NwcSession
}

function parseNwcUri(uri: string): NwcSession {
  // NIP-47 URI format: nostr+walletconnect://<wallet-pubkey>?relay=wss://...&secret=<client-secret>&...
  if (typeof uri !== 'string' || !uri.startsWith('nostr+walletconnect://'))
    throw new ValidationError('Invalid NWC URI')
  const rest = uri.slice('nostr+walletconnect://'.length)
  const [walletPubkey, qs] = rest.split('?')
  if (!walletPubkey || walletPubkey.length < 8) throw new ValidationError('Invalid NWC wallet pubkey in URI')
  const isHex64 = /^[0-9a-fA-F]{64}$/.test(walletPubkey)
  const isNpub = walletPubkey.startsWith('npub') && walletPubkey.length >= 10
  if (!isHex64 && !isNpub) throw new ValidationError('NWC wallet pubkey must be 64-hex or npub')

  const params = new URLSearchParams(qs || '')
  const relays = params.getAll('relay')
  for (const r of relays) {
    if (!/^wss:\/\//i.test(r)) throw new ValidationError('Relay must use wss:// scheme')
  }

  const clientSecret = params.get('secret')
  if (!clientSecret || !/^[0-9a-fA-F]{64}$/.test(clientSecret)) {
    throw new ValidationError('NWC URI missing valid secret (64-hex client private key)')
  }

  const caps = params.getAll('cap')
  const budget = params.get('budget')
  const budgetSats = budget ? Number(budget) : undefined
  if (budget && (!Number.isFinite(budgetSats) || budgetSats! < 0)) {
    throw new ValidationError('budget must be a non-negative number')
  }

  return {
    walletPubkey,
    clientSecret,
    relays,
    caps: caps.length ? caps : undefined,
    budgetSats
  }
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
    if (!this.connected || !this.session?.walletPubkey) throw new ValidationError('Not connected')
    // Return client's public key (derived from secret) as identifier
    return derivePublicKey(this.session.clientSecret)
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

    const clientPubkey = derivePublicKey(this.session.clientSecret)
    const reqTopic = `req/${clientPubkey}`
    const resTopic = `res/${clientPubkey}`
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const envelope: NwcRequestEnvelope = { id, method, params }

    // Encrypt request with NIP-44
    const plaintext = JSON.stringify(envelope)
    const encryptedPayload = encryptNip44(plaintext, this.session.clientSecret, this.session.walletPubkey)

    return new Promise<any>((resolve, reject) => {
      let done = false
      const unsubscribe = this.relay!.subscribe(resTopic, (msg: string) => {
        try {
          // Decrypt response with NIP-44
          const decryptedPayload = decryptNip44(msg, this.session!.clientSecret, this.session!.walletPubkey)
          const res: NwcResponseEnvelope = JSON.parse(decryptedPayload)

          if (res.id !== id) return
          if (done) return
          done = true
          unsubscribe()

          if (res.error) {
            return reject(new ValidationError(`NWC error ${res.error.code}: ${res.error.message}`))
          }

          // on success, decrement budget if applicable
          if (spend > 0 && typeof this.session!.budgetSats === 'number') {
            this.session!.budgetSats = Math.max(0, (this.session!.budgetSats as number) - spend)
          }
          resolve(res.result)
        } catch (e) {
          // ignore malformed messages or decryption failures for other requests
        }
      })

      const timer = setTimeout(() => {
        if (done) return
        done = true
        unsubscribe()
        reject(new ValidationError('Request timed out'))
      }, timeoutMs)

      this.relay!.publish(reqTopic, encryptedPayload).catch((e) => {
        if (done) return
        done = true
        clearTimeout(timer)
        unsubscribe()
        reject(e)
      })
    })
  }
}
