# Changelog

All notable changes to this project will be documented in this file.

## [2.1.3] - 2026-05-02

### ✨ New Features
- **Footer Attribution**: Added GitHub repository link with icon and author credit linking to [karant.dev](https://karant.dev).

### 🔧 Maintenance
- Bumped `aquasecurity/trivy-action` to latest in the security scanning workflow.

---

## [1.1.0] - 2025-12-12

### 🚀 New Features
- **Granular Detection Control**: You can now toggle specific detection types (Email, IP, Credit Card, Secrets) in the new Settings menu.
- **Global Allowlist**: Added a "Safe Values" list to ignore specific strings (e.g., `localhost`, `127.0.0.1`) across all detectors.
- **Persistent Settings**: Your preferences are now saved to local storage.

### 🐛 Known Issues
- **Over-redaction**: Tesseract OCR sometimes lumps non-spaced text (like `Address:123MainSt`) into a single block, causing the entire line to be redacted if a match is found within it. (Tracked in #17).

### 🛡️ Security
- Updated dependency scanning workflow to use `v4` actions.
- Enforced GPLv3 license headers.

---

## [1.0.0] - 2025-12-11
- Initial Public Release.
- Docker support (`karantdev/autoredact`).
- Local-only regex-based redaction (PII, Secrets).
