# 🛡️ AutoRedact

**Secure, client-side image redaction powered by OCR.**

[![CI](https://github.com/karant-dev/AutoRedact/actions/workflows/ci.yml/badge.svg)](https://github.com/karant-dev/AutoRedact/actions/workflows/ci.yml)
[![Release](https://github.com/karant-dev/AutoRedact/actions/workflows/release.yml/badge.svg)](https://github.com/karant-dev/AutoRedact/actions/workflows/release.yml)
[![CI](https://github.com/karant-dev/AutoRedact/actions/workflows/ci.yml/badge.svg)](https://github.com/karant-dev/AutoRedact/actions/workflows/ci.yml)
[![Release](https://github.com/karant-dev/AutoRedact/actions/workflows/release.yml/badge.svg)](https://github.com/karant-dev/AutoRedact/actions/workflows/release.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

[Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/karant-dev/AutoRedact)

All processing happens 100% in your browser. Your images never touch a server.

## ✨ Features

- **🔍 Automatic Detection** - Finds emails, IP addresses, credit cards, and API keys
- **🎯 Precise Redaction** - Uses OCR word-level bounding boxes for accurate redaction
- **🔒 Privacy First** - Everything runs locally via Tesseract.js
- **📦 Batch Processing** - Process unlimited images at once
- **⚡ ZIP Download** - Download all redacted files in one click

## 🚀 Quick Start

```bash
# Option 1: NPM (Local Dev)
npm install
npm run dev

# Option 2: Docker (Easiest)
docker run -p 8080:8080 karantdev/autoredact:latest

# Option 3: Docker Compose
docker compose up -d
```

Open [http://localhost:5173](http://localhost:5173) and drop your images.

## 🎯 What Gets Redacted

| Type | Pattern |
|------|---------|
| 📧 Emails | `user@example.com` |
| 🌐 IPs | `192.168.1.1` |
| 💳 Credit Cards | `4242-4242-4242-4242` |
| 🔑 API Keys | Stripe, GitHub, AWS |

## 🛠️ Tech Stack

- React + Vite + TypeScript
- Tesseract.js v6 (OCR)
- JSZip (batch exports)
- Tailwind CSS

## 📁 Structure

```text
src/
├── components/   # UI Components
├── hooks/        # Custom Hooks
├── utils/        # Logic & Helpers
├── types/        # TS Interfaces
└── App.tsx       # Main Entry
```

## 📄 License

GNU General Public License v3.0
