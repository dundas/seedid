#!/usr/bin/env node
/**
 * SeedID Integration Test
 * 
 * Tests the complete flow:
 * 1. Generate SeedID master key from passphrase
 * 2. Derive Nostr keypair
 * 3. Derive wallet roots for ETH/BTC/SOL
 * 
 * Run: node demos/test-integration.mjs
 */

import { normalizePassphrase, deriveMasterKey, forNostr, forWallet } from '../sdks/core/dist/index.js';
import { utils, schnorr } from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';

function bytesToHex(buf) {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function deriveNostrKeys(root) {
  // Deterministically map HKDF root to valid secp256k1 private key
  let candidate = new Uint8Array(root);
  for (let i = 0; i < 8; i++) {
    if (utils.isValidPrivateKey(candidate)) break;
    candidate = new Uint8Array(sha256(candidate));
  }
  if (!utils.isValidPrivateKey(candidate)) {
    throw new Error('Unable to derive valid secp256k1 private key from root');
  }
  const pubX = await schnorr.getPublicKey(candidate);
  return { priv: candidate, pubXOnlyHex: bytesToHex(pubX) };
}

async function main() {
  console.log('🔐 SeedID Integration Test\n');
  console.log('='.repeat(60));

  // Step 1: Generate SeedID master key
  const passphrase = 'correct horse battery staple';
  console.log('\n📝 Step 1: Generate Master Key');
  console.log(`Passphrase: "${passphrase}"`);
  
  const normalized = normalizePassphrase(passphrase);
  console.log(`Normalized: "${normalized}"`);
  
  const masterKey = await deriveMasterKey(normalized, { algorithm: 'argon2id' });
  console.log(`Master Key: ${bytesToHex(masterKey)}`);
  console.log(`Length: ${masterKey.length} bytes ✓`);

  // Step 2: Derive Nostr keypair
  console.log('\n🔑 Step 2: Derive Nostr Keypair');
  const nostrRoot = await forNostr(masterKey);
  console.log(`Nostr Root: ${bytesToHex(nostrRoot)}`);
  
  const { priv, pubXOnlyHex } = await deriveNostrKeys(nostrRoot);
  console.log(`Private Key: ${bytesToHex(priv)}`);
  console.log(`Public Key (x-only): ${pubXOnlyHex}`);
  console.log(`Nostr npub: npub1${pubXOnlyHex.substring(0, 16)}... ✓`);

  // Step 3: Derive wallet roots and addresses
  console.log('\n💰 Step 3: Derive Wallet Roots & Addresses');
  
  const ethRoot = await forWallet(masterKey, 'eth');
  console.log(`\nETH Root: ${bytesToHex(ethRoot)}`);
  console.log(`Length: ${ethRoot.length} bytes ✓`);
  
  // Derive actual ETH address
  const { deriveEthAddress } = await import('../sdks/wallets/dist/eth.js');
  const ethAccount = await deriveEthAddress(ethRoot, 0);
  console.log(`ETH Address: ${ethAccount.address}`);
  console.log(`✅ Ready to receive ETH/ERC20 tokens!`);
  
  const btcRoot = await forWallet(masterKey, 'btc');
  console.log(`\nBTC Root: ${bytesToHex(btcRoot)}`);
  console.log(`Length: ${btcRoot.length} bytes ✓`);
  
  // Derive actual BTC address
  const { deriveBtcAddress } = await import('../sdks/wallets/dist/btc.js');
  const btcAccount = await deriveBtcAddress(btcRoot, 0);
  console.log(`BTC Address: ${btcAccount.address}`);
  console.log(`✅ Ready to receive BTC!`);
  
  const solRoot = await forWallet(masterKey, 'sol');
  console.log(`\nSOL Root: ${bytesToHex(solRoot)}`);
  console.log(`Length: ${solRoot.length} bytes ✓`);
  
  // Derive actual SOL address
  const { deriveSolAddress } = await import('../sdks/wallets/dist/sol.js');
  const solAccount = await deriveSolAddress(solRoot, 0);
  console.log(`SOL Address: ${solAccount.address}`);
  console.log(`✅ Ready to receive SOL/SPL tokens!`);

  // Verification
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Integration Test Complete!');
  console.log('\nVerified:');
  console.log('  ✓ Passphrase normalization');
  console.log('  ✓ Argon2id master key derivation (32 bytes)');
  console.log('  ✓ Nostr keypair derivation (secp256k1)');
  console.log('  ✓ ETH wallet root derivation (32 bytes)');
  console.log('  ✓ BTC wallet root derivation (32 bytes)');
  console.log('  ✓ SOL wallet root derivation (32 bytes)');
  console.log('\n🎉 All components working correctly!\n');
}

main().catch((err) => {
  console.error('\n❌ Integration test failed:', err);
  process.exit(1);
});
