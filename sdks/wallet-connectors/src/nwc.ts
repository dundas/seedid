import { randomUUID } from 'crypto'
import EventEmitter from 'eventemitter3'
import { WalletProvider, NwcRelay, NwcRequestEnvelope, NwcResponseEnvelope } from './types.js'
import { UnsupportedFeatureError, ValidationError } from './errors.js'
import { encryptNip44, decryptNip44, derivePublicKey } from './nip44.js'
import type { NwcGetInfoResult, NwcPayInvoiceResult } from './nwc-types.js'

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

// Configuration constants
const DEFAULT_REQUEST_TIMEOUT_MS = 2000  // Default timeout for NWC requests
const REQUEST_ID_LENGTH = 36  // RFC 4122 UUID v4 length

// Input validation constants
const MAX_RELAY_URL_LENGTH = 2048
const MAX_CAPABILITY_LENGTH = 64
const MAX_CAPABILITIES_COUNT = 32
const ALLOWED_CAPABILITIES = new Set([
  'get_info',
  'pay_invoice',
  'make_invoice',
  'lookup_invoice',
  'list_transactions',
  'get_balance'
])

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
    if (r.length > MAX_RELAY_URL_LENGTH) {
      throw new ValidationError(`Relay URL exceeds maximum length of ${MAX_RELAY_URL_LENGTH}`)
    }
  }

  const clientSecret = params.get('secret')
  if (!clientSecret || !/^[0-9a-fA-F]{64}$/.test(clientSecret)) {
    throw new ValidationError('NWC URI missing valid secret (64-hex client private key)')
  }

  const caps = params.getAll('cap')

  // Validate capabilities
  if (caps.length > MAX_CAPABILITIES_COUNT) {
    throw new ValidationError(`Number of capabilities exceeds maximum of ${MAX_CAPABILITIES_COUNT}`)
  }
  for (const cap of caps) {
    if (cap.length > MAX_CAPABILITY_LENGTH) {
      throw new ValidationError(`Capability name exceeds maximum length of ${MAX_CAPABILITY_LENGTH}`)
    }
    if (!ALLOWED_CAPABILITIES.has(cap)) {
      throw new ValidationError(`Unsupported capability: ${cap}. Allowed: ${Array.from(ALLOWED_CAPABILITIES).join(', ')}`)
    }
  }

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

  /**
   * Reserve budget before making a payment request (atomic check-and-reserve)
   * @param amountSats - Amount to reserve in sats
   * @throws {ValidationError} if amount exceeds remaining budget
   */
  private reserveBudget(amountSats: number): void {
    if (typeof this.session?.budgetSats !== 'number') return

    const remaining = this.session.budgetSats
    if (amountSats > remaining) {
      throw new ValidationError(`Amount ${amountSats} sats exceeds remaining budget ${remaining} sats`)
    }

    // Reserve immediately (decrement before request to prevent race condition)
    this.session.budgetSats = remaining - amountSats
  }

  /**
   * Release (refund) reserved budget if request fails
   * @param amountSats - Amount to refund in sats
   */
  private releaseBudget(amountSats: number): void {
    if (typeof this.session?.budgetSats !== 'number') return
    this.session.budgetSats += amountSats
  }

  /**
   * Send a generic NWC request to the wallet via encrypted relay communication
   *
   * Automatically enforces capabilities and budget limits before sending.
   * Request IDs are generated using crypto.randomUUID() for security.
   *
   * @template T - Expected response type (defaults to any for generic methods)
   * @param method - NWC method name (e.g., 'get_info', 'pay_invoice')
   * @param params - Method-specific parameters
   * @param timeoutMs - Request timeout in milliseconds (default: 2000ms)
   * @returns Promise resolving to the decrypted response result
   * @throws {ValidationError} If not connected, request times out, wallet returns error, or budget exceeded
   * @throws {UnsupportedFeatureError} If no relay configured or capability not granted
   *
   * @example
   * ```typescript
   * // Generic request
   * const result = await nwc.sendRequest('get_info', {})
   *
   * // Typed request
   * const info = await nwc.sendRequest<NwcGetInfoResult>('get_info', {})
   * ```
   */
  async sendRequest<T = any>(method: string, params: Record<string, any>, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS): Promise<T> {
    if (!this.connected || !this.session) throw new ValidationError('Not connected')
    if (!this.relay) throw new UnsupportedFeatureError('No relay configured')

    // capability enforcement
    if (Array.isArray(this.session.caps) && this.session.caps.length > 0) {
      if (!this.session.caps.includes(method)) {
        throw new UnsupportedFeatureError(`Capability not granted for method: ${method}`)
      }
    }

    // budget enforcement for pay_invoice - reserve BEFORE request
    let reservedAmount = 0
    if (method === 'pay_invoice' && typeof this.session.budgetSats === 'number') {
      const amt = (params && typeof params.amountSats === 'number') ? params.amountSats : NaN
      if (!Number.isFinite(amt) || amt <= 0) throw new ValidationError('pay_invoice requires positive amountSats')

      // Reserve budget atomically (throws if insufficient)
      this.reserveBudget(amt)
      reservedAmount = amt
    }

    const clientPubkey = derivePublicKey(this.session.clientSecret)
    const reqTopic = `req/${clientPubkey}`
    const resTopic = `res/${clientPubkey}`
    const id = randomUUID()
    const envelope: NwcRequestEnvelope = { id, method, params }

    // Encrypt request with NIP-44
    const plaintext = JSON.stringify(envelope)
    const encryptedPayload = encryptNip44(plaintext, this.session.clientSecret, this.session.walletPubkey)

    return new Promise<any>((resolve, reject) => {
      let done = false
      let timer: NodeJS.Timeout

      const unsubscribe = this.relay!.subscribe(resTopic, (msg: string) => {
        try {
          // Decrypt response with NIP-44
          const decryptedPayload = decryptNip44(msg, this.session!.clientSecret, this.session!.walletPubkey)
          const res: NwcResponseEnvelope = JSON.parse(decryptedPayload)

          if (res.id !== id) return
          if (done) return
          done = true
          clearTimeout(timer)
          unsubscribe()

          if (res.error) {
            // Release reserved budget on payment failure
            if (reservedAmount > 0) {
              this.releaseBudget(reservedAmount)
            }
            return reject(new ValidationError(`NWC error ${res.error.code}: ${res.error.message}`))
          }

          // Budget already reserved, no need to decrement on success
          resolve(res.result)
        } catch (e) {
          // Log decryption/parsing errors for debugging (may be responses for other requests)
          if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
            console.debug('NWC: Failed to decrypt/parse message:', e)
          }
          // Ignore - may be malformed or for different request
        }
      })

      timer = setTimeout(() => {
        if (done) return
        done = true
        unsubscribe()
        // Release reserved budget on timeout
        if (reservedAmount > 0) {
          this.releaseBudget(reservedAmount)
        }
        reject(new ValidationError('Request timed out'))
      }, timeoutMs)

      this.relay!.publish(reqTopic, encryptedPayload).catch((e) => {
        if (done) return
        done = true
        clearTimeout(timer)
        unsubscribe()
        // Release reserved budget on publish failure
        if (reservedAmount > 0) {
          this.releaseBudget(reservedAmount)
        }
        reject(e)
      })
    })
  }

  /**
   * Get wallet info (NIP-47 get_info method)
   *
   * Retrieves metadata about the connected wallet including supported methods.
   *
   * @returns Wallet information (alias, pubkey, network, block height, supported methods)
   * @throws {ValidationError} If not connected or request fails
   * @throws {UnsupportedFeatureError} If capability not granted
   *
   * @example
   * ```typescript
   * const info = await nwc.getInfo()
   * console.log(info.alias)          // "My Lightning Wallet"
   * console.log(info.methods)        // ["pay_invoice", "make_invoice", ...]
   * console.log(info.network)        // "mainnet"
   * ```
   */
  async getInfo(): Promise<NwcGetInfoResult> {
    return this.sendRequest<NwcGetInfoResult>('get_info', {})
  }

  /**
   * Pay a Lightning invoice (NIP-47 pay_invoice method)
   *
   * Atomically reserves budget before sending request, then releases on failure.
   * Validates invoice format (must start with "ln").
   *
   * @param invoice - BOLT11 invoice string (e.g., "lnbc1...")
   * @param amountSats - Optional amount in sats (required for zero-amount invoices)
   * @returns Payment result with preimage and fees
   * @throws {ValidationError} If invoice is invalid, amount exceeds budget, or payment fails
   * @throws {UnsupportedFeatureError} If capability not granted
   *
   * @example
   * ```typescript
   * // Pay standard invoice
   * const result = await nwc.payInvoice('lnbc100n1...')
   * console.log(result.preimage)     // "abc123..."
   * console.log(result.fees_paid)    // 2 (sats)
   *
   * // Pay zero-amount invoice
   * const result2 = await nwc.payInvoice('lnbc1...', 1000)
   * ```
   */
  async payInvoice(
    invoice: string,
    amountSats?: number
  ): Promise<NwcPayInvoiceResult> {
    if (!invoice || typeof invoice !== 'string' || !invoice.startsWith('ln')) {
      throw new ValidationError('invoice must be a valid BOLT11 string (starting with "ln")')
    }

    const params: any = { invoice }
    if (typeof amountSats === 'number') {
      if (!Number.isFinite(amountSats) || amountSats <= 0) {
        throw new ValidationError('amountSats must be a positive number')
      }
      params.amountSats = amountSats
    }

    return this.sendRequest<NwcPayInvoiceResult>('pay_invoice', params)
  }
}
