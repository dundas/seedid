import { deriveNostrRootFromPassphrase, deriveNostrKeysFromRoot, signEventWithPriv } from './crypto.js';

async function main() {
  const args = process.argv.slice(2);
  const passArgIdx = args.indexOf('--passphrase');
  const contentArgIdx = args.indexOf('--content');
  const passphrase = passArgIdx >= 0 ? args[passArgIdx + 1] : undefined;
  const content = contentArgIdx >= 0 ? args[contentArgIdx + 1] : 'hello from seedid nostr demo';
  const createdAt = Math.floor(Date.now() / 1000);

  if (!passphrase) {
    console.error('Usage: node dist/index.js --passphrase "<your passphrase>" [--content "message"]');
    process.exit(1);
  }

  // Derive Nostr root and keypair
  const root = await deriveNostrRootFromPassphrase(passphrase);
  const { priv, pubXOnlyHex } = await deriveNostrKeysFromRoot(root);

  // Build and sign a minimal Nostr event (kind 1)
  const evt = { kind: 1, content, created_at: createdAt };
  const signed = await signEventWithPriv(priv, evt, pubXOnlyHex);

  console.log(JSON.stringify({ pubkey: signed.pubkey, id: signed.id, sig: signed.sig, content: signed.content, created_at: signed.created_at }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
