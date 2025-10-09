import { describe, it, expect } from 'vitest'
import { encryptNip44, decryptNip44, generatePrivateKey, derivePublicKey } from '../src/nip44.js'
import { ValidationError } from '../src/errors.js'

describe('NIP-44 encryption', () => {
  it('encrypts and decrypts a message successfully', () => {
    const aliceSecret = generatePrivateKey()
    const bobSecret = generatePrivateKey()
    const alicePubkey = derivePublicKey(aliceSecret)
    const bobPubkey = derivePublicKey(bobSecret)

    const plaintext = 'Hello from Alice to Bob via NIP-44!'

    // Alice encrypts to Bob
    const encrypted = encryptNip44(plaintext, aliceSecret, bobPubkey)
    expect(encrypted).toBeTruthy()
    expect(encrypted).not.toBe(plaintext)

    // Bob decrypts from Alice
    const decrypted = decryptNip44(encrypted, bobSecret, alicePubkey)
    expect(decrypted).toBe(plaintext)
  })

  it('supports bidirectional encryption', () => {
    const aliceSecret = generatePrivateKey()
    const bobSecret = generatePrivateKey()
    const alicePubkey = derivePublicKey(aliceSecret)
    const bobPubkey = derivePublicKey(bobSecret)

    const msgFromAlice = 'Message from Alice'
    const msgFromBob = 'Response from Bob'

    // Alice -> Bob
    const encrypted1 = encryptNip44(msgFromAlice, aliceSecret, bobPubkey)
    const decrypted1 = decryptNip44(encrypted1, bobSecret, alicePubkey)
    expect(decrypted1).toBe(msgFromAlice)

    // Bob -> Alice
    const encrypted2 = encryptNip44(msgFromBob, bobSecret, alicePubkey)
    const decrypted2 = decryptNip44(encrypted2, aliceSecret, bobPubkey)
    expect(decrypted2).toBe(msgFromBob)
  })

  it('encrypts JSON payloads correctly', () => {
    const aliceSecret = generatePrivateKey()
    const bobSecret = generatePrivateKey()
    const alicePubkey = derivePublicKey(aliceSecret)
    const bobPubkey = derivePublicKey(bobSecret)

    const payload = { id: '123', method: 'get_info', params: { test: true } }
    const plaintext = JSON.stringify(payload)

    const encrypted = encryptNip44(plaintext, aliceSecret, bobPubkey)
    const decrypted = decryptNip44(encrypted, bobSecret, alicePubkey)
    const parsed = JSON.parse(decrypted)

    expect(parsed).toEqual(payload)
  })

  it('rejects invalid inputs for encryption', () => {
    const validSecret = generatePrivateKey()
    const validPubkey = derivePublicKey(validSecret)

    // Empty plaintext
    expect(() => encryptNip44('', validSecret, validPubkey)).toThrow(ValidationError)

    // Invalid sender privkey
    expect(() => encryptNip44('test', 'invalid', validPubkey)).toThrow(ValidationError)
    expect(() => encryptNip44('test', '1234', validPubkey)).toThrow(ValidationError)

    // Invalid recipient pubkey
    expect(() => encryptNip44('test', validSecret, 'invalid')).toThrow(ValidationError)
  })

  it('rejects invalid inputs for decryption', () => {
    const validSecret = generatePrivateKey()
    const validPubkey = derivePublicKey(validSecret)
    const encrypted = encryptNip44('test', validSecret, validPubkey)

    // Empty ciphertext
    expect(() => decryptNip44('', validSecret, validPubkey)).toThrow(ValidationError)

    // Invalid recipient privkey
    expect(() => decryptNip44(encrypted, 'invalid', validPubkey)).toThrow(ValidationError)

    // Invalid sender pubkey
    expect(() => decryptNip44(encrypted, validSecret, 'invalid')).toThrow(ValidationError)
  })

  it('fails to decrypt with wrong keys', () => {
    const aliceSecret = generatePrivateKey()
    const bobSecret = generatePrivateKey()
    const charlieSecret = generatePrivateKey()
    const alicePubkey = derivePublicKey(aliceSecret)
    const bobPubkey = derivePublicKey(bobSecret)

    const plaintext = 'Secret message'
    const encrypted = encryptNip44(plaintext, aliceSecret, bobPubkey)

    // Charlie tries to decrypt (wrong private key)
    expect(() => decryptNip44(encrypted, charlieSecret, alicePubkey)).toThrow()
  })

  it('generates valid 64-char hex private keys', () => {
    const privkey = generatePrivateKey()
    expect(privkey).toMatch(/^[0-9a-fA-F]{64}$/)
  })

  it('derives valid 64-char hex public keys', () => {
    const privkey = generatePrivateKey()
    const pubkey = derivePublicKey(privkey)
    expect(pubkey).toMatch(/^[0-9a-fA-F]{64}$/)
  })
})
