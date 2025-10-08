import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { WalletManager, detectMetaMask, detectPhantom } from '../src/manager.js'

function setWindow(obj: any) {
  ;(globalThis as any).window = obj
}

describe('WalletManager', () => {
  beforeEach(() => {
    const callbacks: Record<string, Function[]> = {}
    setWindow({
      ethereum: {
        request: async ({ method, params }: any) => {
          if (method === 'eth_requestAccounts') return ['0xabcdef']
          if (method === 'personal_sign') {
            const hex = params[0] as string
            const payload = hex.replace(/^0x/, '')
            const sig = 'b'.repeat(Math.max(64, payload.length))
            return '0x' + sig
          }
          throw new Error('unsupported')
        },
        on: (evt: string, cb: Function) => {
          callbacks[evt] ||= []
          callbacks[evt].push(cb)
        }
      },
      solana: {
        connect: async () => ({
          publicKey: {
            toBytes: () => new Uint8Array([7,7,7]),
            toString: () => 'Fq2fC9A3JcU4Gtm2v5XnZbYr7o2qv3r1n1NQkLw8s7FQ'
          }
        }),
        signMessage: async (_msg: Uint8Array, _enc: string) => ({ signature: new Uint8Array([8,8,8]) }),
        on: (_evt: string, _cb: Function) => {},
        disconnect: async () => {}
      }
    })
  })

  afterEach(() => {
    setWindow(undefined)
  })

  it('detects wallets and connects to MetaMask and Phantom', async () => {
    const wm = new WalletManager()
    const wallets = wm.detectWallets()
    const mmInfo = wallets.find(w => w.type === 'metamask')
    const phInfo = wallets.find(w => w.type === 'phantom')

    expect(mmInfo?.installed).toBe(true)
    expect(phInfo?.installed).toBe(true)

    const mm = await wm.connect('metamask')
    expect(mm.isConnected()).toBe(true)
    expect(await mm.getAddress()).toBe('0xabcdef')

    const ph = await wm.connect('phantom')
    expect(ph.isConnected()).toBe(true)
    const addr = await ph.getAddress()
    expect(addr.length).toBeGreaterThan(0)
  })
})
