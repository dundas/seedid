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
 *
 * Uses ECDH + HKDF for key derivation, then ChaCha20 + HMAC-SHA256 for authenticated encryption.
 * Implementation is provided by nostr-tools (Cure53 audited).
 *
 * @param plaintext - Message to encrypt (will be UTF-8 encoded)
 * @param senderPrivkey - Sender's 32-byte private key (64-char hex string)
 * @param recipientPubkey - Recipient's 32-byte public key (64-char hex string)
 * @returns Base64-encoded encrypted payload
 * @throws {ValidationError} If inputs are invalid (empty plaintext, malformed keys) or encryption fails
 *
 * @example
 * ```typescript
 * const encrypted = encryptNip44(
 *   'Hello, world!',
 *   'a'.repeat(64),  // sender private key (hex)
 *   'b'.repeat(64)   // recipient public key (hex)
 * )
 * ```
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
    // Log detailed error for debugging, but throw generic message
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.debug('NIP-44 encryption error:', err)
    }
    throw new ValidationError('NIP-44 encryption failed')
  }
}

/**
 * Decrypt a NIP-44 v2 encrypted message
 *
 * Uses ECDH + HKDF for key derivation, then ChaCha20 + HMAC-SHA256 for authenticated decryption.
 * HMAC verification prevents tampering and authenticates the sender.
 *
 * @param ciphertext - Base64-encoded encrypted payload (from encryptNip44)
 * @param recipientPrivkey - Recipient's 32-byte private key (64-char hex string)
 * @param senderPubkey - Sender's 32-byte public key (64-char hex string)
 * @returns Decrypted plaintext string
 * @throws {ValidationError} If inputs are invalid (empty ciphertext, malformed keys), HMAC verification fails, or decryption fails
 *
 * @example
 * ```typescript
 * const plaintext = decryptNip44(
 *   encryptedPayload,
 *   'a'.repeat(64),  // recipient private key (hex)
 *   'b'.repeat(64)   // sender public key (hex)
 * )
 * ```
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
    // Log detailed error for debugging, but throw generic message
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.debug('NIP-44 decryption error:', err)
    }
    throw new ValidationError('NIP-44 decryption failed')
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
