import EventEmitter from 'eventemitter3'
import { WalletProvider } from './types.js'

export class PhantomConnector extends EventEmitter implements WalletProvider {
  readonly type = 'phantom' as const
  readonly chain = 'sol' as const
  private connected = false
  private address: string | null = null
  private pubkey: Uint8Array | null = null

  private get solana(): any {
    return (globalThis as any)?.window?.solana
  }

  isConnected(): boolean {
    return this.connected
  }

  async connect(): Promise<void> {
    const sol = this.solana
    if (!sol) throw new Error('Phantom (window.solana) not detected')
    const resp = await sol.connect()
    // Phantom returns publicKey object with toBytes() or toString()
    const pk = resp?.publicKey
    if (!pk) throw new Error('Phantom did not return a publicKey')
    const pkBytes: Uint8Array = typeof pk?.toBytes === 'function' ? pk.toBytes() : pk
    this.pubkey = pkBytes
    // Base58 string if available
    const addr: string = typeof pk?.toString === 'function' ? pk.toString() : (sol?.publicKey?.toString?.() ?? '')
    if (!addr) throw new Error('Phantom did not return an address')
    this.address = addr
    this.connected = true
    sol.on?.('disconnect', (err: any) => {
      this.connected = false
      this.emit('disconnect', err)
    })
  }

  async disconnect(): Promise<void> {
    const sol = this.solana
    try { await sol?.disconnect?.() } catch {}
    this.connected = false
    this.address = null
    this.pubkey = null
    this.removeAllListeners()
  }

  async getAddress(): Promise<string> {
    if (!this.connected || !this.address) throw new Error('Not connected')
    return this.address
  }

  async getPublicKey(): Promise<Uint8Array> {
    if (!this.connected || !this.pubkey) throw new Error('Not connected')
    return this.pubkey
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.connected) throw new Error('Not connected')
    const sol = this.solana
    const { signature } = await sol.signMessage(message, 'utf8')
    return signature
  }
}
