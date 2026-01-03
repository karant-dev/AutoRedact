# AutoRedact

Automatic, client-side image redaction using Tesseract.js.

## Tech Stack
- React + Vite + TypeScript
- Tesseract.js v6 (OCR)
- JSZip (batch exports)
- Tailwind CSS

## Architecture
- **Local processing**: All OCR runs in-browser, no server.
- **Components**: Modular React components (`src/components/`).
- **Hooks**: Custom logic hooks (`useOCR`, `useBatch`).
- **Utils**: Helper functions (`src/utils/`).

## Features
- **Automatic Detection**: Emails, IPs, credit cards, Secrets
- **Zero Manual Work**: No selection needed. Just drop and download.
- **Power Features**: Batch processing, PDF support (Browser & CLI), ZIP download
- **CLI Support**: Full CLI for automation, supports Images and PDFs (requires `poppler-utils`).

## Security & DevSecOps
- **SAST**: GitHub CodeQL (JavaScript/TypeScript).
- **SCA & Config**: Trivy (fs mode) scans for secrets and vulnerabilities.
- **Container Security**: Trivy scans the Docker image in the Release pipeline.
- **Dependency Management**: Dependabot auto-updates npm packages.

## Key Implementation Notes

### Tesseract.js v6 Blocks
Must enable blocks output explicitly:
```typescript
worker.recognize(url, {}, { blocks: true })
```

### Sensitive Patterns
Located in `src/constants/patterns.ts`:
- Email: Standard RFC-compliant
- IPv4: Four octets
- Credit cards: 13-19 digits
- Secrets: Stripe, GitHub, AWS, OpenAI keys

## Running
```bash
npm install
npm run dev
```

## Structure
```
src/
├── components/   # UI
├── hooks/        # Logic
├── utils/        # Helpers
├── types/        # Interfaces
└── App.tsx       # Main
```
