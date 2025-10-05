# Deterministic Identity: A Cryptographic System for Self-Sovereign Digital Identity

## Abstract

A purely deterministic digital identity system would allow users to maintain permanent cryptographic identities without relying on service providers. Digital signatures provide authentication, but existing systems require centralized authorities, network consensus, or transaction fees. We propose a solution using hierarchical key derivation from memorized passphrases. The passphrase undergoes Argon2id key stretching with sufficient parameters to make brute force attacks computationally infeasible. Service-specific keys are derived through HKDF domain separation using stable Service Resource Names, preventing correlation while maintaining determinism. The same passphrase always generates the same identity. The system requires minimal infrastructure. Services verify signatures through standard cryptographic protocols. As long as users maintain control of a passphrase with sufficient entropy, they control their identity.

## 1. Introduction

Digital services on the Internet have come to rely almost exclusively on service providers acting as trusted third parties to manage user identity. While the system works well enough for most purposes, it still suffers from the inherent weaknesses of the trust based model. Accounts can be terminated without recourse. Services cease operations and identities are lost. The need for separate credentials at each service leads to password reuse and systemic vulnerabilities.

What is needed is an identity system based on cryptographic proof instead of trust, allowing any user to maintain consistent identity across services without the need for a trusted third party. Identities that are computationally deterministic would protect users from service failures, and standard authentication protocols could easily be implemented. In this paper, we propose a solution to the identity problem using hierarchical deterministic key generation. The system is secure as long as users can protect a single high-entropy passphrase.

## 2. Identity Generation

We define a digital identity as a chain of cryptographic keys. Users generate their identity from a passphrase, deriving service-specific keys through a one-way function that prevents correlation.

```
Passphrase → Master Key → Service Keys → Signatures
```

The problem is that services could correlate users if the same key is used everywhere. A common solution is to generate random keys for each service, but this requires storing and backing up multiple secrets. We need a way for users to deterministically generate unique keys for each service from a single secret.

## 3. Key Derivation

The solution we propose begins with a memory-hard key derivation function. A passphrase undergoes normalization and key stretching, making dictionary attacks computationally prohibitive.

```python
def derive_master(passphrase):
    normalized = unicodedata.normalize('NFKD', passphrase).lower().strip()
    return argon2id(
        normalized.encode('utf-8'),
        salt=b'seedid_v1',
        memory_cost=65536,  # 64 MiB
        time_cost=3,
        parallelism=1
    )
```

Service-specific seeds are derived using HKDF with domain separation:

```python
def derive_service_seed(master, srn, curve):
    info = f"rp:{srn}|curve:{curve}|v1".encode()
    return hkdf_expand(master, info, 32)
```

## 4. Hierarchical Keys

To support multiple keys per service, we implement BIP32 hardened derivation:

```
I = HMAC-SHA512(chain_code, 0x00 || parent_key || index)
child_key = (I[:32] + parent_key) mod n
child_chain = I[32:]
```

For Ed25519, we use SLIP-0010 hardened derivation. The hardened-only constraint prevents key compromise from affecting parent keys.

## 5. Service Resource Names

Services are identified by stable Service Resource Names (SRNs) rather than domains:
- `did:web:example.com` - DID with embedded domain
- `did:ion:EiClkZMDxPK...` - Domain-independent DID  
- `pkg:android:com.app|cert:SHA256:...` - App package with certificate

The SRN serves as the domain separator in key derivation. If a service changes ownership, the SRN remains stable or publishes a cryptographic delegation.

## 6. Security

By convention, passphrases must contain at least 90 bits of entropy. This is typically achieved using 7 or more words from a Diceware wordlist. Example passphrases meeting this requirement:

```
"correct horse battery staple mountain ocean forest"
"acoustic phantom debris tunnel vitamin eternal wisdom"
"crystal voyage humble sender matrix dolphin anchor"
```

Each Diceware word contributes approximately 12.9 bits of entropy. With Argon2id parameters of 64 MiB memory and 3 iterations, each guess requires approximately 200ms on modern hardware.

For an attacker with 10,000 GPUs:
- 5 words (65 bits): 36 years
- 6 words (77 bits): 590,000 years
- 7 words (90 bits): 1.9 × 10^10 years
- 8 words (103 bits): 6.2 × 10^14 years

The entropy may help encourage users to choose strong passphrases. If an attacker is able to obtain the passphrase, they would control all derived identities. They ought to find it more difficult than traditional password attacks due to the memory-hard function.

## 7. Authentication

Services authenticate users through challenge-response:

```python
def authenticate(master, srn, challenge):
    seed = derive_service_seed(master, srn, "secp256k1")
    key = derive_key(seed)
    
    proof = {
        "challenge": challenge,
        "publicKey": key.public,
        "timestamp": time.now()
    }
    proof["signature"] = sign(key.private, proof)
    return proof
```

Derivation paths are never transmitted. Each service sees only its specific public key.

## 8. Recovery

Once identity generation is buried under sufficient entropy, recovery mechanisms can be implemented. To facilitate this without breaking determinism, passphrases can be split using Shamir's Secret Sharing, with shares distributed to trusted parties.

A 3-of-5 threshold scheme would maintain identity availability even if two shares are lost. The shares do not need to be stored securely as k-1 shares reveal no information about the passphrase.

## 9. Test Vectors

Test vectors with 90 bits of entropy would be approximately:

```
Passphrase: "correct horse battery staple mountain ocean forest"
Master: 3d4c8f7b2a9e5d1c6f3b8a7e4d2c9f5b...
SRN: "did:web:example.com"
Seed: 8f3b4c2d9a7e5b1f6c8d2a9e4f7b3c5d...
Public: 02a8c5f3d7e9b4c6f8a2d5e7b9c4f6a8...
```

With properly generated passphrases of 7 Diceware words, different services receive unlinkable keys while users maintain deterministic generation.

## 10. Simplified Identity Verification

It is possible to verify identity without complex infrastructure. A user only needs to keep a copy of their passphrase, which they can use to regenerate keys when needed. They can't be impersonated without the passphrase, but by deriving the appropriate key, they can prove ownership to any service.

As such, the verification is reliable as long as sufficient entropy is maintained, but is more vulnerable if users choose weak passphrases. One strategy to protect against this would be to require minimum entropy estimates before accepting identity generation. Services that require higher security will probably still want to implement additional verification methods for more independent security.

## 11. Privacy

The traditional identity model achieves a level of privacy by limiting access to credentials to the parties involved and the identity provider. The necessity to authenticate publicly precludes this method, but privacy can still be maintained by breaking correlation in another place: by keeping service keys unlinkable. The public can see someone authenticating to a service, but without information linking authentications to the same identity. This is similar to the level of privacy in cryptocurrency transactions, where addresses are public but ownership is private.

As an additional firewall, new keys should be derived for each purpose to keep them from being linked to a common identity. Some linking is still unavoidable with identity attestations, which necessarily reveal that credentials were issued to the same entity. The risk is that if the master passphrase is revealed, linking could reveal all service relationships.

## 12. Conclusion

We have proposed a system for digital identity without relying on trust. We started with passphrases undergoing memory-hard key derivation, which provides strong resistance to brute force attacks. To solve correlation, we proposed HKDF domain separation using Service Resource Names. To enable multiple keys per service, we implemented hierarchical key derivation maintaining cryptographic isolation between child keys. The system is robust in its cryptographic simplicity. Users work with a single passphrase with little complexity. They do not need to manage multiple credentials, since keys are derived deterministically and only need to be computed when required. Services can verify authenticity accepting standard signatures as proof of identity. They authenticate with public keys, expressing acceptance of valid signatures and rejecting invalid ones. Any needed protocols can be implemented with this cryptographic foundation.

## References

[1] S. Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System," 2008. [https://bitcoin.org/bitcoin.pdf](https://bitcoin.org/bitcoin.pdf)

[2] P. Wuille, "BIP 32: Hierarchical Deterministic Wallets," 2012. [https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)

[3] A. Biryukov, D. Dinu, D. Khovratovich, "Argon2," RFC 9106, 2021. [https://tools.ietf.org/rfc/rfc9106.txt](https://tools.ietf.org/rfc/rfc9106.txt)

[4] H. Krawczyk, P. Eronen, "HKDF," RFC 5869, 2010. [https://tools.ietf.org/rfc/rfc5869.txt](https://tools.ietf.org/rfc/rfc5869.txt)

[5] Satoshi Labs, "SLIP-0010," 2015. [https://github.com/satoshilabs/slips/blob/master/slip-0010.md](https://github.com/satoshilabs/slips/blob/master/slip-0010.md)

[6] W3C, "Decentralized Identifiers (DIDs) v1.0," 2022. [https://www.w3.org/TR/did-core/](https://www.w3.org/TR/did-core/)