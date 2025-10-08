import EventEmitter from 'eventemitter3'

export type Chain = 'eth' | 'sol' | 'lightning'
export type WalletType = 'metamask' | 'phantom' | 'nwc' | 'seedid-derived'

export interface WalletInfo {
  type: WalletType
  chain: Chain
  installed: boolean
  name?: string
}

// Minimal EIP-1193 provider surface
export interface EIP1193Provider {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>
  on?(event: 'accountsChanged' | 'chainChanged' | 'disconnect', listener: (...args: any[]) => void): void
  removeListener?(event: 'accountsChanged' | 'chainChanged' | 'disconnect', listener: (...args: any[]) => void): void
}

// Minimal Phantom provider surface (Solana)
export interface PhantomProvider {
  connect(): Promise<{ publicKey: { toBytes(): Uint8Array; toString(): string } }>
  signMessage(message: Uint8Array, encoding: 'utf8'): Promise<{ signature: Uint8Array }>
  signAllTransactions?(txs: any[]): Promise<any[]>
  on?(event: 'disconnect' | 'accountChanged', listener: (...args: any[]) => void): void
  removeListener?(event: 'disconnect' | 'accountChanged', listener: (...args: any[]) => void): void
  disconnect(): Promise<void>
  publicKey?: { toBytes(): Uint8Array; toString(): string }
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
