import EventEmitter from 'eventemitter3'
import { WalletProvider, PhantomProvider } from './types.js'

export class PhantomConnector extends EventEmitter implements WalletProvider {
  readonly type = 'phantom' as const
  readonly chain = 'sol' as const
  private connected = false
  private address: string | null = null
  private pubkey: Uint8Array | null = null
  private _sol: PhantomProvider | null = null
  private handlers: {
    disconnect?: (err: any) => void;
    accountChanged?: (...args: any[]) => void;
  } = {}

  private get solana(): PhantomProvider | null {
    return this._sol || ((globalThis as any)?.window?.solana as PhantomProvider | undefined) || null
  }

  isConnected(): boolean {
    return this.connected
  }

  async connect(): Promise<void> {
    const sol = (globalThis as any)?.window?.solana as PhantomProvider | undefined
    if (!sol) throw new Error('Phantom (window.solana) not detected')
    this._sol = sol
    const resp = await sol.connect()
    // Phantom returns publicKey object with toBytes() or toString()
    const pk = resp?.publicKey
    if (!pk) throw new Error('Phantom did not return a publicKey')
    const pkBytes: Uint8Array = pk.toBytes()
    this.pubkey = pkBytes
    // Base58 string
    const addr: string = pk.toString()
    if (!addr) throw new Error('Phantom did not return an address')
    this.address = addr
    this.connected = true
    this.handlers.disconnect = (err: any) => {
      this.connected = false
      this.emit('disconnect', err)
    }
    this.handlers.accountChanged = (...args: any[]) => {
      // Attempt to refresh address/publicKey if provider exposes them
      const pkObj = (this._sol as any)?.publicKey
      if (pkObj && typeof pkObj.toBytes === 'function' && typeof pkObj.toString === 'function') {
        try {
          const pkBytes: Uint8Array = pkObj.toBytes()
          this.pubkey = pkBytes
          const addr: string = pkObj.toString()
          if (addr) this.address = addr
        } catch {}
      }
      this.emit('accountChanged', args)
    }
    sol.on?.('disconnect', this.handlers.disconnect)
    sol.on?.('accountChanged', this.handlers.accountChanged)
  }

  async disconnect(): Promise<void> {
    const sol = this.solana
    try { await sol?.disconnect?.() } catch {}
    this.connected = false
    this.address = null
    this.pubkey = null
    if (sol && sol.removeListener) {
      if (this.handlers.disconnect) sol.removeListener('disconnect', this.handlers.disconnect)
      if (this.handlers.accountChanged) sol.removeListener('accountChanged', this.handlers.accountChanged)
    }
    this.handlers = {}
    this._sol = null
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
    if (!(message instanceof Uint8Array) || message.length === 0) throw new Error('message must be a non-empty Uint8Array')
    const sol = this.solana
    if (!sol) throw new Error('Phantom (window.solana) not detected')
    const { signature } = await sol.signMessage(message, 'utf8')
    return signature
  }

  async signAllTransactions(txs: any[]): Promise<any[]> {
    if (!this.connected) throw new Error('Not connected')
    if (!Array.isArray(txs) || txs.length === 0) throw new Error('txs must be a non-empty array')
    const sol = this.solana
    if (!sol || !sol.signAllTransactions) throw new Error('signAllTransactions not supported by provider')
    return sol.signAllTransactions(txs)
  }
}
