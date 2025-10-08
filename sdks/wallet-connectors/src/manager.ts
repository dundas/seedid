import { WalletInfo, WalletProvider, WalletType, Chain } from './types.js'
import { MetaMaskConnector } from './metamask.js'
import { PhantomConnector } from './phantom.js'

export function detectMetaMask(): WalletInfo {
  const has = typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined' && !!(globalThis as any).window?.ethereum
  return { type: 'metamask', chain: 'eth', installed: !!has, name: 'MetaMask' }
}

export function detectPhantom(): WalletInfo {
  const has = typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined' && !!(globalThis as any).window?.solana
  return { type: 'phantom', chain: 'sol', installed: !!has, name: 'Phantom' }
}

export class WalletManager {
  private providers: Map<WalletType, WalletProvider> = new Map()

  detectWallets(): WalletInfo[] {
    return [detectMetaMask(), detectPhantom()]
  }

  async connect(type: WalletType, options?: any): Promise<WalletProvider> {
    let provider = this.providers.get(type)
    if (!provider) {
      if (type === 'metamask') provider = new MetaMaskConnector()
      else if (type === 'phantom') provider = new PhantomConnector()
      else throw new Error(`Unsupported wallet type: ${type}`)
      this.providers.set(type, provider)
    }
    await provider.connect(options)
    return provider
  }

  getProvider(chain: Chain): WalletProvider | null {
    for (const p of this.providers.values()) if (p.chain === chain) return p
    return null
  }

  getProviders(): Map<WalletType, WalletProvider> {
    return new Map(this.providers)
  }
}
