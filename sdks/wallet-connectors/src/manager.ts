import { WalletInfo, WalletProvider, WalletType, Chain } from './types.js'
import { MetaMaskConnector } from './metamask.js'
import { PhantomConnector } from './phantom.js'
import { NwcConnector } from './nwc.js'

export function detectMetaMask(): WalletInfo {
  const w = (globalThis as any).window
  const has = typeof globalThis !== 'undefined' && typeof w !== 'undefined' && !!w?.ethereum && w.ethereum?.isMetaMask === true
  return { type: 'metamask', chain: 'eth', installed: !!has, name: 'MetaMask' }
}

export function detectPhantom(): WalletInfo {
  const w = (globalThis as any).window
  const has = typeof globalThis !== 'undefined' && typeof w !== 'undefined' && !!w?.solana && w.solana?.isPhantom === true
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
      else if (type === 'nwc') provider = new NwcConnector()
      else throw new Error(`Unsupported wallet type: ${type}`)
      this.providers.set(type, provider)
    }
    await provider!.connect(options)
    return provider!
  }

  getProvider(chain: Chain): WalletProvider | null {
    for (const p of this.providers.values()) if (p.chain === chain) return p
    return null
  }

  getProviders(): Map<WalletType, WalletProvider> {
    return new Map(this.providers)
  }
}
