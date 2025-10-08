import EventEmitter from 'eventemitter3'

export type Chain = 'eth' | 'sol' | 'lightning'
export type WalletType = 'metamask' | 'phantom' | 'nwc' | 'seedid-derived'

export interface WalletInfo {
  type: WalletType
  chain: Chain
  installed: boolean
  name?: string
}

export interface WalletProvider extends EventEmitter {
  type: WalletType
  chain: Chain

  connect(options?: any): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean

  getAddress(): Promise<string>
  getPublicKey?(): Promise<Uint8Array>
  getBalance?(): Promise<bigint>

  signMessage(message: Uint8Array): Promise<Uint8Array>
  signTransaction?(tx: any): Promise<any>
}
