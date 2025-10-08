import EventEmitter from 'eventemitter3'
import { WalletProvider } from './types.js'

function toHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export class MetaMaskConnector extends EventEmitter implements WalletProvider {
  readonly type = 'metamask' as const
  readonly chain = 'eth' as const
  private connected = false
  private account: string | null = null
  private currentChainId: string | null = null

  private get ethereum(): any {
    return (globalThis as any)?.window?.ethereum
  }

  isConnected(): boolean {
    return this.connected
  }

  async connect(): Promise<void> {
    const eth = this.ethereum
    if (!eth) throw new Error('MetaMask (window.ethereum) not detected')
    const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' })
    if (!accounts || accounts.length === 0) throw new Error('No accounts returned by MetaMask')
    this.account = accounts[0]
    this.connected = true
    try {
      this.currentChainId = await eth.request({ method: 'eth_chainId' })
    } catch {}
    // listeners
    eth.on?.('accountsChanged', (accs: string[]) => {
      this.account = accs?.[0] ?? null
      this.emit('accountsChanged', accs)
    })
    eth.on?.('chainChanged', (chainId: string) => {
      this.currentChainId = chainId
      this.emit('chainChanged', chainId)
    })
    eth.on?.('disconnect', (err: any) => {
      this.connected = false
      this.emit('disconnect', err)
    })
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.account = null
    this.removeAllListeners()
  }

  async getAddress(): Promise<string> {
    if (!this.connected || !this.account) throw new Error('Not connected')
    return this.account
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.connected || !this.account) throw new Error('Not connected')
    const eth = this.ethereum
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
