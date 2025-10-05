
---

## 🛡️ `SECURITY.md`

```markdown
# SeedID Security Policy
**Last Updated:** January 2025  
**Applies To:** SeedID Core (Argon2id + HKDF Derivation Library and Schemas)

---

## 🧠 Supported Versions
| Version | Supported | Notes |
|----------|------------|-------|
| 2.1 (current) | ✅ | Production and public review |
| ≤ 2.0 | ❌ | Deprecated; known weaknesses |

---

## 🧩 Reporting Vulnerabilities
If you find a potential security issue, please report it **privately**.

- **Email:** [security@seedid.dev](mailto:security@seedid.dev)  
- **PGP:** https://seedid.dev/pgp.txt  
- **Subject:** `SeedID Security Disclosure`

Please include:
1. A clear description and minimal proof of concept  
2. Expected vs. observed behavior  
3. Environment details (OS, hardware, Python version)  
4. Suggested mitigation (if known)

We acknowledge receipt within 72 hours and will provide a remediation timeline.

---

## ⏱ Coordinated Disclosure Timeline
| Phase | Target Time |
|--------|--------------|
| Acknowledge report | ≤ 3 days |
| Initial assessment | ≤ 7 days |
| Fix development | ≤ 30 days |
| Public advisory | After coordinated release |

---

## 🧮 Scope
Covered components:
- `corrected_identity_system.py`, `test_vectors.py`  
- JSON schemas under `/schemas`  
- Official SeedID relays / milters / middleware

Out of scope:
- Third-party forks or downstream derivatives  
- Experimental or unreleased branches

---

## 🧪 Ethical Testing
You are welcome to test SeedID components in your own environment or approved sandboxes.  
**Do not** attack production infrastructure without prior written authorization.

Recommended tools:
- `argon2-cffi`, `hkdf` python libs  
- `pytest` with `pytest-benchmark` for timing tests  
- `cryptography` for curve and HKDF validation  

---

## 🤝 Researcher Acknowledgments
Security researchers who responsibly disclose issues will be credited in release notes and our SeedID Hall of Fame (unless anonymity is requested).

---

## 📜 References
- [SeedID White Paper v2.1](docs/SeedID_WhitePaper_v2.1.md)  
- [CODEX5 Review (2025)]  
- [Red-Team Response (2025)]

---

© 2025 SeedID Project — CC BY 4.0 (text) | Apache-2.0 (code)
