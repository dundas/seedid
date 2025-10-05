# SeedID Core – Deterministic Identity System
**Version 2.1 (2025)**  
Self-sovereign digital identity derived entirely from mathematics.

---

## 🔍 Overview
**SeedID** provides a permanent, portable identity that any individual can regenerate from memory alone.  
It replaces centralized account systems with mathematically guaranteed self-sovereignty using:

- **Argon2id → HKDF → BIP32 / SLIP-0010** deterministic derivation  
- **Per-domain unlinkability** via explicit HKDF `info` labels  
- **Memory-hard key stretching** (256 MiB × 5 iterations × 2 threads)  
- **Domain-canonicalization** and pairwise key isolation  

SeedID supports both new-generation messaging (SeedID Messaging) and retrofitted protocols (SeedMail, ActivityPub).

---

## 🧩 Key Features
| Category | Capability |
|-----------|-------------|
| **Deterministic Identity** | Recreate your entire identity tree from a single secret |
| **Per-Domain Separation** | Each site/app gets an unlinkable key |
| **Strong Hardening** | Argon2id 256 MiB × 5; ≥ 90 bits entropy |
| **Portable Formats** | Works with DIDs, WebAuthn, OAuth DPoP |
| **Immediate Revocation** | Capability-based access control |
| **Open Review** | CODEX5 + Red-Team 2025 validated |

---

## 📁 Repository Structure
```
seedid/
├── README.md
├── SECURITY.md
├── core/
│   └── README.md                        # Core documentation
├── schemas/
│   ├── contact-card-v1.json
│   ├── ref-token-v1.json
│   ├── cap-row-v1.json
│   └── README.md
└── docs/
    └── seedid whitepaper v0.md
```

---

## ⚙️ Quick Start
```bash
git clone https://github.com/dundas/seedid.git
cd seedid
# See core/README.md for implementation details
# See docs/ for whitepaper and specifications
```
This repository contains the community documentation, schemas, and specifications for SeedID.

---

## 🧮 Recommended Parameters
| Parameter | Value | Notes |
|------------|--------|-------|
| Argon2id Memory | 256 MiB | GPU-resistant |
| Time Cost (t) | 5 | ≈ 0.35 s per derivation |
| Parallelism (p) | 2 | Defender-hardware optimized |
| Minimum Entropy | ≥ 90 bits (7 Diceware words) | Prevents offline attack |
| Curves | secp256k1 / Ed25519 | BIP32 / SLIP-0010 hardened |

---

## 📚 Documentation
- **[SeedID White Paper v0](docs/seedid%20whitepaper%20v0.md)** – full theory and cryptography
- **[Schemas](schemas/)** – JSON Schemas for contact cards, referral tokens, and capabilities
- **[Core Documentation](core/)** – Implementation guidance and specifications

---

## 🛡 Security
See [SECURITY.md](SECURITY.md) for coordinated disclosure policy.  
Please report vulnerabilities privately to **security@seedid.dev**.

---

## 📜 License
- **Code:** Apache-2.0  
- **Documentation:** CC BY 4.0  
© 2025 SeedID Project — All Rights Reserved.
