# PRD: External Wallet Connectors (Path A - Bring Your Own Wallet)

## Summary
Create a unified wallet connector system that allows SeedID to integrate with existing wallets (MetaMask, Phantom, Alby, etc.) via standard protocols. Users keep their existing wallets and custody, while SeedID provides identity and orchestrates multi-chain operations through a single interface.

## Goals
- Unified `WalletProvider` interface that abstracts different wallet types
- MetaMask connector for ETH/EVM chains (via window.ethereum)
- Phantom connector for SOL (via window.solana)
- Nostr Wallet Connect (NWC) for Lightning (via NIP-47)
- Auto-detection of available wallets in browser
- Consistent API regardless of underlying wallet
- Support wallet switching and multi-wallet scenarios

## Non-Goals (v0.1)
- Mobile wallet deep linking (WalletConnect v2)
- Hardware wallet direct integration (use via MetaMask/Phantom)
- Wallet UI/modal (just connection logic)
- Transaction batching/bundling

## Architecture

### Core Abstraction
```typescript
// Unified wallet provider interface
export interface WalletProvider {
  type: 'metamask' | 'phantom' | 'nwc' | 'seedid-derived';
  chain: Chain | 'lightning';
  
  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Account info
  getAddress(): Promise<string>;
  getPublicKey?(): Promise<Uint8Array>;
  getBalance?(): Promise<bigint>;
  
  // Signing
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  signTransaction(tx: any): Promise<any>;
  
  // Events
  on(event: 'accountsChanged' | 'disconnect', handler: Function): void;
  off(event: string, handler: Function): void;
}
```

### Connector Implementations

#### MetaMask Connector (ETH/EVM)
- Detect `window.ethereum`
- Use EIP-1193 provider API
- Support `eth_requestAccounts`, `eth_sendTransaction`, `personal_sign`
- Handle chain switching (EIP-3326)
- Listen for account/chain changes

#### Phantom Connector (SOL)
- Detect `window.solana` (Phantom standard)
- Use Solana wallet adapter protocol
- Support `connect()`, `signTransaction()`, `signMessage()`
- Handle account changes

#### NWC Connector (Lightning)
- Implement NIP-47 client (from Lightning PRD)
- Parse NWC connection URI
- Send encrypted DMs for `pay_invoice`, `make_invoice`
- Handle async responses via relay subscription

### Wallet Manager
```typescript
export class WalletManager {
  // Detect available wallets
  static detectWallets(): WalletInfo[];
  
  // Connect to specific wallet
  async connect(type: WalletType, options?: any): Promise<WalletProvider>;
  
  // Get active providers
  getProvider(chain: Chain | 'lightning'): WalletProvider | null;
  
  // Multi-wallet support
  getProviders(): Map<string, WalletProvider>;
}
```

## Integration Points

### With SeedID Identity
- SeedID provides Nostr identity (npub)
- Wallets provide payment capabilities
- Link identity to wallet addresses via Nostr events (NIP-05 style)

### With SeedID-Derived Wallets
- User can choose: "Connect Wallet" vs "Generate with SeedID"
- If both exist, allow switching between them
- Unified interface works with either source

## Technical Details

### MetaMask Integration
```typescript
export class MetaMaskConnector implements WalletProvider {
  private provider: any; // window.ethereum
  
  async connect() {
    const accounts = await this.provider.request({
      method: 'eth_requestAccounts'
    });
    // Store account, set up listeners
  }
  
  async signTransaction(tx: EthTransaction) {
    return await this.provider.request({
      method: 'eth_sendTransaction',
      params: [tx]
    });
  }
}
```

### Phantom Integration
```typescript
export class PhantomConnector implements WalletProvider {
  private provider: any; // window.solana
  
  async connect() {
    const resp = await this.provider.connect();
    // resp.publicKey
  }
  
  async signTransaction(tx: SolanaTransaction) {
    const signed = await this.provider.signTransaction(tx);
    return signed;
  }
}
```

### NWC Integration
```typescript
export class NWCConnector implements WalletProvider {
  private relay: NostrRelay;
  private walletPubkey: string;
  private secret: Uint8Array;
  
  async connect() {
    // Parse nostr+walletconnect:// URI
    // Connect to relay, subscribe to responses
  }
  
  async payInvoice(bolt11: string) {
    const req = { method: 'pay_invoice', params: { invoice: bolt11 } };
    const encrypted = await encryptNIP44(req, this.secret);
    await this.relay.publish(/* DM event */);
    return await this.waitForResponse();
  }
}
```

## Dependencies
- No new deps for MetaMask/Phantom (use window objects)
- `nostr-tools` or similar for NWC relay communication
- `@seedid/lightning` (from Lightning PRD) for NWC message encoding

## User Experience Flow

### Initial Connection
1. User clicks "Connect Wallet"
2. App detects available wallets (MetaMask, Phantom, etc.)
3. User selects wallet → connector initiates connection
4. Wallet prompts user for approval
5. Connection established, address available

### Transaction Flow
1. App calls `walletManager.getProvider('eth').signTransaction(tx)`
2. Connector routes to MetaMask
3. MetaMask shows confirmation UI
4. User approves → signed tx returned
5. App broadcasts to network

### Multi-Chain
```typescript
// User has MetaMask (ETH) + Phantom (SOL) + Alby (Lightning)
const ethProvider = await walletManager.connect('metamask');
const solProvider = await walletManager.connect('phantom');
const lnProvider = await walletManager.connect('nwc', { uri: nwcUri });

// Unified interface
await ethProvider.signTransaction(ethTx);
await solProvider.signTransaction(solTx);
await lnProvider.payInvoice(bolt11);
```

## Acceptance Criteria
- Detect MetaMask and connect successfully
- Sign ETH transaction via MetaMask, verify signature
- Detect Phantom and connect successfully
- Sign SOL transaction via Phantom, verify signature
- Connect to NWC wallet via URI, pay invoice
- Handle account switching in MetaMask/Phantom
- Handle disconnection gracefully
- Tests with mocked window.ethereum/window.solana

## Security Considerations
- Never request private keys from wallets
- Validate all data from wallet providers (untrusted)
- Handle malicious/modified wallet extensions gracefully
- Clear sensitive data (NWC secrets) on disconnect
- Warn users about phishing (verify wallet extension authenticity)

## Browser Compatibility
- Chrome/Brave (MetaMask, Phantom)
- Firefox (MetaMask)
- Safari (limited extension support, document limitations)
- Mobile browsers (via WalletConnect in future)

## Future Enhancements (v0.2+)
- WalletConnect v2 for mobile wallets
- Ledger/Trezor direct integration
- Coinbase Wallet connector
- Wallet preference persistence (localStorage)
- Multi-account support per wallet
- Gas estimation helpers
- Transaction history tracking
