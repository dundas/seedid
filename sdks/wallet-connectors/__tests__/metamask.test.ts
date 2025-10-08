import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MetaMaskConnector } from '../src/metamask.js'

function setWindow(obj: any) {
  ;(globalThis as any).window = obj
}

describe('MetaMaskConnector', () => {
  beforeEach(() => {
    const callbacks: Record<string, Function[]> = {}
    const calls: any[] = []
    setWindow({
      ethereum: {
        isMetaMask: true,
        request: async ({ method, params }: any) => {
          calls.push({ method, params })
          if (method === 'eth_requestAccounts') return ['0x1234567890abcdef']
          if (method === 'eth_chainId') return '0x1'
          if (method === 'wallet_switchEthereumChain') return null
          if (method === 'eth_sendTransaction') return '0xdeadbeef'
          if (method === 'personal_sign') {
            const hex = params[0] as string
            const payload = hex.replace(/^0x/, '')
            const sig = 'a'.repeat(Math.max(64, payload.length))
            return '0x' + sig
          }
          throw new Error('unsupported')
        },
        on: (evt: string, cb: Function) => {
          callbacks[evt] ||= []
          callbacks[evt].push(cb)
        },
        _trigger: (evt: string, data: any) => {
          (callbacks[evt] || []).forEach((cb) => cb(data))
        },
        _calls: calls
      }
    })
  })

  afterEach(() => {
    setWindow(undefined)
  })

  it('connects and returns address; signs message', async () => {
    const mm = new MetaMaskConnector()
    await mm.connect()
    expect(mm.isConnected()).toBe(true)
    const addr = await mm.getAddress()
    expect(addr).toBe('0x1234567890abcdef')

    const msg = new TextEncoder().encode('hello')
    const sig = await mm.signMessage(msg)
    expect(sig).toBeInstanceOf(Uint8Array)
    expect(sig.length).toBeGreaterThan(0)
  })

  it('switches chain and emits chainChanged; sends transaction; handles rejection', async () => {
    const mm = new MetaMaskConnector()
    await mm.connect()
    let observed: string | null = null
    mm.on('chainChanged', (cid: string) => { observed = cid })
    // trigger chainChanged event from provider
    ;(globalThis as any).window.ethereum._trigger('chainChanged', '0x5')
    expect(observed).toBe('0x5')

    // switchChain should call wallet_switchEthereumChain
    await mm.switchChain(1)
    const calls = (globalThis as any).window.ethereum._calls as any[]
    expect(calls.some((c: any) => c.method === 'wallet_switchEthereumChain')).toBe(true)

    // sendTransaction returns hash
    const addr1 = '0x' + '1'.repeat(40)
    const addr2 = '0x' + '2'.repeat(40)
    const txHash = await mm.sendTransaction({ from: addr1, to: addr2, value: '0x0' })
    expect(txHash).toBe('0xdeadbeef')

    // simulate user rejection for tx
    ;(globalThis as any).window.ethereum.request = async ({ method }: any) => {
      if (method === 'eth_sendTransaction') {
        const err: any = new Error('User rejected')
        err.code = 4001
        throw err
      }
      return null
    }
    const rFrom = '0x' + '3'.repeat(40)
    const rTo = '0x' + '4'.repeat(40)
    await expect(mm.sendTransaction({ from: rFrom, to: rTo, value: '0x0' } as any)).rejects.toThrow(/User rejected transaction/)
  })

  it('rejects empty message and validates tx shape', async () => {
    const mm = new MetaMaskConnector()
    await mm.connect()
    await expect(mm.signMessage(new Uint8Array())).rejects.toThrow(/non-empty Uint8Array/)

    // invalid tx.from
    await expect(mm.sendTransaction({ from: '0x123' } as any)).rejects.toThrow(/20-byte hex address/)
  })

  it('removes listeners on disconnect', async () => {
    const mm = new MetaMaskConnector()
    await mm.connect()
    let changed = false
    mm.on('chainChanged', () => { changed = true })
    await mm.disconnect()
    ;(globalThis as any).window.ethereum._trigger('chainChanged', '0x2a')
    // Should remain false since listener removed on connector and provider
    expect(changed).toBe(false)
  })
})
