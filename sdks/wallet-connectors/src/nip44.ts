import { nip44, getPublicKey, generateSecretKey } from 'nostr-tools'
import { ValidationError } from './errors.js'

/**
 * NIP-44 encryption utilities for NWC
 *
 * Uses ChaCha20 + HMAC-SHA256 for authenticated encryption
 * as specified in NIP-44 v2 (audited by Cure53)
 */

/**
 * Encrypt a message using NIP-44 v2
 * @param plaintext - Message to encrypt (will be UTF-8 encoded)
 * @param senderPrivkey - Sender's 32-byte private key (hex)
 * @param recipientPubkey - Recipient's 32-byte public key (hex)
 * @returns Base64-encoded encrypted payload
 */
export function encryptNip44(
  plaintext: string,
  senderPrivkey: string,
  recipientPubkey: string
): string {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new ValidationError('plaintext must be a non-empty string')
  }
  if (!isHex64(senderPrivkey)) {
    throw new ValidationError('senderPrivkey must be 64-char hex string')
  }
  if (!isHex64(recipientPubkey)) {
    throw new ValidationError('recipientPubkey must be 64-char hex string')
  }

  try {
    // Derive conversation key using HKDF
    const conversationKey = nip44.v2.utils.getConversationKey(senderPrivkey, recipientPubkey)
    // Encrypt with ChaCha20 + HMAC-SHA256
    const encrypted = nip44.v2.encrypt(plaintext, conversationKey)
    return encrypted
  } catch (err) {
    throw new ValidationError(`NIP-44 encryption failed: ${(err as Error).message}`)
  }
}

/**
 * Decrypt a NIP-44 v2 encrypted message
 * @param ciphertext - Base64-encoded encrypted payload
 * @param recipientPrivkey - Recipient's 32-byte private key (hex)
 * @param senderPubkey - Sender's 32-byte public key (hex)
 * @returns Decrypted plaintext string
 */
export function decryptNip44(
  ciphertext: string,
  recipientPrivkey: string,
  senderPubkey: string
): string {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new ValidationError('ciphertext must be a non-empty string')
  }
  if (!isHex64(recipientPrivkey)) {
    throw new ValidationError('recipientPrivkey must be 64-char hex string')
  }
  if (!isHex64(senderPubkey)) {
    throw new ValidationError('senderPubkey must be 64-char hex string')
  }

  try {
    // Derive conversation key (same as encryption, roles swapped)
    const conversationKey = nip44.v2.utils.getConversationKey(recipientPrivkey, senderPubkey)
    // Decrypt with ChaCha20 + verify HMAC
    const decrypted = nip44.v2.decrypt(ciphertext, conversationKey)
    return decrypted
  } catch (err) {
    throw new ValidationError(`NIP-44 decryption failed: ${(err as Error).message}`)
  }
}

/**
 * Generate a random 32-byte secret key (for testing/demos)
 * @returns 64-character hex string
 */
export function generatePrivateKey(): string {
  return Buffer.from(generateSecretKey()).toString('hex')
}

/**
 * Derive public key from private key
 * @param privkey - 32-byte private key (hex)
 * @returns 32-byte public key (hex)
 */
export function derivePublicKey(privkey: string): string {
  if (!isHex64(privkey)) {
    throw new ValidationError('privkey must be 64-char hex string')
  }
  return getPublicKey(privkey)
}

function isHex64(s: string): boolean {
  return typeof s === 'string' && /^[0-9a-fA-F]{64}$/.test(s)
}
