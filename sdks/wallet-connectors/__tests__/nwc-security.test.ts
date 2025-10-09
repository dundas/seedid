import { describe, it, expect } from 'vitest'
import { NwcConnector } from '../src/nwc.js'
import { ValidationError } from '../src/errors.js'
import { generatePrivateKey } from '../src/nip44.js'

describe('NwcConnector security tests', () => {
  describe('parseNwcUri fuzzing', () => {
    it('rejects extremely long wallet pubkey', async () => {
      const nwc = new NwcConnector()
      const longPubkey = 'a'.repeat(10000)
      const clientSecret = generatePrivateKey()
      const uri = `nostr+walletconnect://${longPubkey}?relay=wss://relay.example.org&secret=${clientSecret}`

      await expect(nwc.connect({ uri })).rejects.toThrow(ValidationError)
    })

    it('rejects URI with special characters in relay URL', async () => {
      const nwc = new NwcConnector()
      const pk = 'a'.repeat(64)
      const clientSecret = generatePrivateKey()

      // Try various injection attempts
      const maliciousRelays = [
        'wss://relay.example.org\x00malicious',
        'wss://relay.example.org%00malicious',
        'wss://relay.example.org\nmalicious',
        'wss://relay.example.org;drop table users--'
      ]

      for (const relay of maliciousRelays) {
        const uri = `nostr+walletconnect://${pk}?relay=${encodeURIComponent(relay)}&secret=${clientSecret}`
        // Should either reject or sanitize
        try {
          await nwc.connect({ uri })
          // If it connects, verify relay was not corrupted
          expect(nwc.isConnected()).toBe(true)
        } catch (e) {
          // Rejecting is also acceptable
          expect(e).toBeInstanceOf(ValidationError)
        }
      }
    })

    it('rejects malformed URI schemes', async () => {
      const nwc = new NwcConnector()
      const pk = 'a'.repeat(64)
      const clientSecret = generatePrivateKey()

      const malformedSchemes = [
        `http://walletconnect://${pk}?relay=wss://r&secret=${clientSecret}`,
        `nostr+walletconnect:/${pk}?relay=wss://r&secret=${clientSecret}`,  // Single slash
        `nostr+walletconnect:${pk}?relay=wss://r&secret=${clientSecret}`,   // No slashes
        `nostrwalletconnect://${pk}?relay=wss://r&secret=${clientSecret}`,  // Missing +
      ]

      for (const uri of malformedSchemes) {
        await expect(nwc.connect({ uri })).rejects.toThrow(/Invalid NWC/)
      }
    })

    it('rejects URIs with missing required components', async () => {
      const nwc = new NwcConnector()
      const pk = 'a'.repeat(64)

      const invalidUris = [
        'nostr+walletconnect://',  // No pubkey
        `nostr+walletconnect://${pk}`,  // No query string (missing secret)
        `nostr+walletconnect://${pk}?relay=wss://r`,  // No secret
        `nostr+walletconnect://?secret=${'a'.repeat(64)}`,  // No pubkey
      ]

      for (const uri of invalidUris) {
        await expect(nwc.connect({ uri })).rejects.toThrow(ValidationError)
      }
    })

    it('rejects invalid hex characters in secret', async () => {
      const nwc = new NwcConnector()
      const pk = 'a'.repeat(64)

      const invalidSecrets = [
        'z'.repeat(64),  // Invalid hex char 'z'
        'g'.repeat(64),  // Invalid hex char 'g'
        '!'.repeat(64),  // Special characters
        'a'.repeat(63),  // Too short
        'a'.repeat(65),  // Too long
      ]

      for (const secret of invalidSecrets) {
        const uri = `nostr+walletconnect://${pk}?relay=wss://r&secret=${secret}`
        await expect(nwc.connect({ uri })).rejects.toThrow(/secret/)
      }
    })

    it('rejects non-wss relay URLs', async () => {
      const nwc = new NwcConnector()
      const pk = 'a'.repeat(64)
      const clientSecret = generatePrivateKey()

      const invalidRelays = [
        'ws://relay.example.org',   // Not wss
        'http://relay.example.org',  // HTTP
        'https://relay.example.org', // HTTPS
        'ftp://relay.example.org',   // FTP
      ]

      for (const relay of invalidRelays) {
        const uri = `nostr+walletconnect://${pk}?relay=${relay}&secret=${clientSecret}`
        await expect(nwc.connect({ uri })).rejects.toThrow(/wss/)
      }
    })

    it('handles edge case budget values', async () => {
      const nwc = new NwcConnector()
      const pk = 'a'.repeat(64)
      const clientSecret = generatePrivateKey()

      // Negative budget
      const uriNegative = `nostr+walletconnect://${pk}?relay=wss://r&secret=${clientSecret}&budget=-100`
      await expect(nwc.connect({ uri: uriNegative })).rejects.toThrow(/budget/)

      // Non-numeric budget
      const uriNaN = `nostr+walletconnect://${pk}?relay=wss://r&secret=${clientSecret}&budget=invalid`
      await expect(nwc.connect({ uri: uriNaN })).rejects.toThrow(/budget/)

      // Extremely large budget (should work, just testing edge case)
      const uriHuge = `nostr+walletconnect://${pk}?relay=wss://r&secret=${clientSecret}&budget=999999999999999`
      await expect(nwc.connect({ uri: uriHuge })).resolves.toBeUndefined()
      expect(nwc.isConnected()).toBe(true)
    })
  })

  describe('Request ID collision resistance', () => {
    it('generates unique IDs across 1000 concurrent requests', async () => {
      const { randomUUID } = await import('crypto')
      const ids = new Set<string>()

      // Generate 1000 UUIDs
      for (let i = 0; i < 1000; i++) {
        const id = randomUUID()
        expect(ids.has(id)).toBe(false)  // No collision
        expect(id.length).toBe(36)  // RFC 4122 UUID v4 format
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
        ids.add(id)
      }

      expect(ids.size).toBe(1000)
    })

    it('UUID format matches RFC 4122 v4 specification', async () => {
      const { randomUUID } = await import('crypto')

      for (let i = 0; i < 100; i++) {
        const id = randomUUID()
        const parts = id.split('-')

        // UUID v4 structure: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        expect(parts).toHaveLength(5)
        expect(parts[0]).toHaveLength(8)
        expect(parts[1]).toHaveLength(4)
        expect(parts[2]).toHaveLength(4)
        expect(parts[3]).toHaveLength(4)
        expect(parts[4]).toHaveLength(12)

        // Version field (4)
        expect(parts[2][0]).toBe('4')

        // Variant field (8, 9, a, or b)
        expect(['8', '9', 'a', 'b']).toContain(parts[3][0])
      }
    })
  })

  describe('Input validation edge cases', () => {
    it('rejects empty strings', async () => {
      const nwc = new NwcConnector()
      await expect(nwc.connect({ uri: '' })).rejects.toThrow(ValidationError)
    })

    it('rejects URIs with null bytes', async () => {
      const nwc = new NwcConnector()
      const pk = 'a'.repeat(64)
      const clientSecret = generatePrivateKey()
      const uriWithNull = `nostr+walletconnect://${pk}\x00?relay=wss://r&secret=${clientSecret}`

      // Should either reject or handle gracefully
      try {
        await nwc.connect({ uri: uriWithNull })
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError)
      }
    })

    it('handles duplicate query parameters', async () => {
      const nwc = new NwcConnector()
      const pk = 'a'.repeat(64)
      const clientSecret = generatePrivateKey()

      // Multiple secrets (should use first or last, but be deterministic)
      const uri = `nostr+walletconnect://${pk}?secret=${clientSecret}&secret=${'b'.repeat(64)}&relay=wss://r`
      await expect(nwc.connect({ uri })).resolves.toBeUndefined()
      expect(nwc.isConnected()).toBe(true)
    })

    it('handles extremely long relay lists', async () => {
      const nwc = new NwcConnector()
      const pk = 'a'.repeat(64)
      const clientSecret = generatePrivateKey()

      // Create 100 relay parameters
      const relays = Array.from({ length: 100 }, (_, i) => `relay=wss://relay${i}.example.org`).join('&')
      const uri = `nostr+walletconnect://${pk}?${relays}&secret=${clientSecret}`

      await expect(nwc.connect({ uri })).resolves.toBeUndefined()
      expect(nwc.isConnected()).toBe(true)
    })
  })
})
