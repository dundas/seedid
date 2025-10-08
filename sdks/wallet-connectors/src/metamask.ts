import EventEmitter from 'eventemitter3'
import { WalletProvider, EIP1193Provider } from './types.js'

function toHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export class MetaMaskConnector extends EventEmitter implements WalletProvider {
  readonly type = 'metamask' as const
  readonly chain = 'eth' as const
  private connected = false
  private account: string | null = null
  private currentChainId: string | null = null
  private _eth: EIP1193Provider | null = null
  private handlers: {
    accountsChanged?: (accs: string[]) => void;
    chainChanged?: (cid: string) => void;
    disconnect?: (err: any) => void;
  } = {}

  private get ethereum(): EIP1193Provider | null {
    return this._eth || ((globalThis as any)?.window?.ethereum as EIP1193Provider | undefined) || null
  }

  isConnected(): boolean {
    return this.connected
  }

  async connect(): Promise<void> {
    const eth = (globalThis as any)?.window?.ethereum as EIP1193Provider | undefined
    if (!eth) throw new Error('MetaMask (window.ethereum) not detected')
    this._eth = eth
    const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' })
    if (!accounts || accounts.length === 0) throw new Error('No accounts returned by MetaMask')
    this.account = accounts[0]
    this.connected = true
    try {
      this.currentChainId = await eth.request({ method: 'eth_chainId' })
    } catch {}
    // listeners
    this.handlers.accountsChanged = (accs: string[]) => {
      this.account = accs?.[0] ?? null
      this.emit('accountsChanged', accs)
    }
    this.handlers.chainChanged = (chainId: string) => {
      this.currentChainId = chainId
      this.emit('chainChanged', chainId)
    }
    this.handlers.disconnect = (err: any) => {
      this.connected = false
      this.emit('disconnect', err)
    }
    eth.on?.('accountsChanged', this.handlers.accountsChanged)
    eth.on?.('chainChanged', this.handlers.chainChanged)
    eth.on?.('disconnect', this.handlers.disconnect)
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.account = null
    const eth = this.ethereum
    if (eth && eth.removeListener) {
      if (this.handlers.accountsChanged) eth.removeListener('accountsChanged', this.handlers.accountsChanged)
      if (this.handlers.chainChanged) eth.removeListener('chainChanged', this.handlers.chainChanged)
      if (this.handlers.disconnect) eth.removeListener('disconnect', this.handlers.disconnect)
    }
    this.handlers = {}
    this._eth = null
    this.removeAllListeners()
  }

  async getAddress(): Promise<string> {
    if (!this.connected || !this.account) throw new Error('Not connected')
    return this.account
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.connected || !this.account) throw new Error('Not connected')
    if (!(message instanceof Uint8Array) || message.length === 0) throw new Error('message must be a non-empty Uint8Array')
    const eth = this.ethereum
    if (!eth) throw new Error('MetaMask (window.ethereum) not detected')
    const hexMsg = toHex(message)
    let sigHex: string
    try {
      sigHex = await eth.request({ method: 'personal_sign', params: [hexMsg, this.account] })
    } catch (e: any) {
      if (e && (e.code === 4001 || e.message?.includes('User rejected'))) {
        throw new Error('User rejected signature')
      }
      throw e
    }
    // remove 0x and decode
    const clean = sigHex.replace(/^0x/, '')
    const out = new Uint8Array(clean.length / 2)
    for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
    return out
  }

  // optional transaction signing can be added later

  async switchChain(chainId: string | number): Promise<void> {
    const eth = this.ethereum
    if (!eth) throw new Error('MetaMask (window.ethereum) not detected')
    const hexId = typeof chainId === 'number' ? '0x' + chainId.toString(16) : chainId
    if (typeof hexId !== 'string' || !/^0x[0-9a-fA-F]+$/.test(hexId)) throw new Error('chainId must be 0x-prefixed hex')
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] })
      this.currentChainId = hexId
    } catch (e: any) {
      throw e
    }
  }

  async sendTransaction(tx: any): Promise<string> {
    const eth = this.ethereum
    if (!eth) throw new Error('MetaMask (window.ethereum) not detected')
    // basic validation
    const isHexAddr = (s: any) => typeof s === 'string' && /^0x[0-9a-fA-F]{40}$/.test(s)
    const is0xHex = (s: any) => typeof s === 'string' && /^0x[0-9a-fA-F]*$/.test(s)
    if (!tx || !isHexAddr(tx.from)) throw new Error('tx.from must be a 0x-prefixed 20-byte hex address')
    if (tx.to && !isHexAddr(tx.to)) throw new Error('tx.to must be a 0x-prefixed 20-byte hex address')
    if (tx.value && !is0xHex(tx.value)) throw new Error('tx.value must be 0x-prefixed hex string')
    if (tx.data && !is0xHex(tx.data)) throw new Error('tx.data must be 0x-prefixed hex string')
    try {
      const hash: string = await eth.request({ method: 'eth_sendTransaction', params: [tx] })
      return hash
    } catch (e: any) {
      if (e && (e.code === 4001 || e.message?.includes('User rejected'))) {
        throw new Error('User rejected transaction')
      }
      throw e
    }
  }
}
