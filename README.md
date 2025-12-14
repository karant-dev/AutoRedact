# 🛡️ AutoRedact

**Secure, client-side image redaction powered by OCR.**

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

### Command Line Interface (CLI)

AutoRedact now supports a fully offline CLI mode using the same powerful engine. (jpg and png support only, for now. PDF support incoming)

```bash
# Process a single image
npm run cli -- input.jpg

# Disable specific redactors
npm run cli -- input.jpg --no-emails --no-ips

# Use custom rules
npm run cli -- input.jpg --block-words "Confidential" --custom-regex "Project-\d+"
```

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
├── adapters/     # Interface implementations (Browser/Node)
├── components/   # UI Components
├── core/         # Pure Logic (Regex, Math, Image Proc)
├── hooks/        # Custom Hooks
├── utils/        # Helpers
├── types/        # TS Interfaces
├── cli.ts        # CLI Entry Point
└── App.tsx       # Main Entry
```

## 📄 License

GNU General Public License v3.0

## 📖 Real-World Recipes

### 🛠️ CLI Power Usage

#### 1. Batch Process a Directory
The CLI processes one file at a time. Use a shell loop to process entire folders:
```bash
# Process all JPGs in 'input' dir and save to 'output' dir
mkdir -p output
for f in input/*.jpg; do
  npm run cli -- "$f" -o "output/$(basename "$f")"
done
```

#### 2. Strict Redaction for Finance/Invoices
Enable strict blocking for sensitive documents:
```bash
npm run cli -- invoice.jpg \
  --block-words "Confidential,SSN,Account" \
  --custom-regex "(?i)account\s*#?\s*\d+" \
  --no-ips # Disable IP scanner if irrelevant to boost speed
```

#### 3. Allowlist for Internal Docs
Prevent redaction of known internal terms or headers:
```bash
npm run cli -- internal-doc.jpg \
  --allowlist "CorpCorp,192.168.1.1,ProjectX"
```

---

### 🐳 Docker API Examples

The Docker API runs on port 3000 by default. It currently uses standard detection settings (Emails, IPs, Keys, PII).

#### 1. Quick Test via Curl
```bash
curl -X POST http://localhost:3000/redact \
  -F "image=@/path/to/doc.jpg" \
  -o redacted.png
```
*Check the `X-Redacted-Stats` header in the response for detection counts.*

#### 2. Python Integration
Process images programmatically in your Python apps:

```python
import requests

url = 'http://localhost:3000/redact'
files = {'image': open('contract.jpg', 'rb')}

response = requests.post(url, files=files)

if response.status_code == 200:
    with open('redacted_contract.png', 'wb') as f:
        f.write(response.content)
    print("Stats:", response.headers.get('X-Redacted-Stats'))
else:
    print("Error:", response.text)
```

#### 3. Node.js Integration (Native Fetch)
Requires Node.js 18+. No extra libraries needed!

```javascript
import fs from 'fs';

const fileBuffer = fs.readFileSync('id_card.jpg');
const blob = new Blob([fileBuffer], { type: 'image/jpeg' });

const formData = new FormData();
formData.append('image', blob, 'id_card.jpg');

const response = await fetch('http://localhost:3000/redact', {
  method: 'POST',
  body: formData
});

if (response.ok) {
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync('redacted_id.png', buffer);
  console.log('Stats:', response.headers.get('x-redacted-stats'));
}
```

#### 4. Custom Configuration (JSON)
You can fine-tune the API detection by passing a `settings` JSON field:

```bash
# Disable Email redaction and add custom block words
curl -X POST http://localhost:3000/redact \
  -F "image=@doc.jpg" \
  -F 'settings={"email":false, "blockWords":["CONFIDENTIAL"]}' \
  -o redacted.png
```
