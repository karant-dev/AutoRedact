# AutoRedact API Documentation

The AutoRedact API provides a simple, high-performance interface for redacting sensitive information from images using the same engine as the CLI and Web UI.

## Base URL

By default, the Docker container exposes the API on port `3000`.

\`\`\`
http://localhost:3000
\`\`\`

---

## Endpoints

### 1. Redact Image

**POST** \`/redact\`

Uploads an image for processing and returns the redacted image.

#### Request Headers
*   **Content-Type**: \`multipart/form-data\`

#### Request Body (Multipart Fields)

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| \`image\` | File | **Yes** | The image file to process. Supports \`.jpg\` and \`.png\`. |
| \`settings\` | JSON String | No | Configuration object to control detection rules. |

#### Settings Schema

The \`settings\` field accepts a JSON string matching the \`DetectionSettings\` interface:

\`\`\`json
{
  "email": boolean,        // Default: true
  "ip": boolean,           // Default: true
  "creditCard": boolean,   // Default: true
  "secret": boolean,       // Default: true
  "pii": boolean,          // Default: true
  "allowlist": string[],   // e.g. ["127.0.0.1", "MyCorp"]
  "blockWords": string[],  // e.g. ["CONFIDENTIAL"]
  "customRegex": [
    {
      "pattern": "regex_pattern",
      "flags": "i" // Optional
    }
  ]
}
\`\`\`

#### Response

*   **Status**: \`200 OK\`
*   **Content-Type**: \`image/png\` (The redacted image)
*   **Header** \`X-Redacted-Stats\`: JSON string containing detection counts.

---

## Examples

### 1. Basic Usage (Curl)
Redact an image using default settings:

\`\`\`bash
curl -X POST http://localhost:3000/redact \\
  -F "image=@/path/to/document.jpg" \\
  -o redacted.png
\`\`\`

### 2. Advanced Configuration (Curl)
Disable email redaction and add custom block words:

\`\`\`bash
curl -X POST http://localhost:3000/redact \\
  -F "image=@invoice.jpg" \\
  -F 'settings={"email":false, "blockWords":["CONFIDENTIAL", "SSN"]}' \\
  -o redacted_invoice.png
\`\`\`

### 3. Node.js (Native Fetch)
Requires Node 18+:

\`\`\`javascript
import fs from 'fs';

const fileBuffer = fs.readFileSync('doc.jpg');
const blob = new Blob([fileBuffer], { type: 'image/jpeg' });

const formData = new FormData();
formData.append('image', blob, 'doc.jpg');
formData.append('settings', JSON.stringify({
  allowlist: ['CorpName'],
  ip: false // Disable IP scanner
}));

const response = await fetch('http://localhost:3000/redact', {
  method: 'POST',
  body: formData
});

if (response.ok) {
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync('redacted.png', buffer);
  console.log('Stats:', response.headers.get('x-redacted-stats'));
}
\`\`\`

### 4. Python (Requests)

\`\`\`python
import requests
import json

url = 'http://localhost:3000/redact'
files = {'image': open('doc.jpg', 'rb')}
settings = {
    "email": False,
    "blockWords": ["DO NOT DISTRIBUTE"]
}

data = {'settings': json.dumps(settings)}

response = requests.post(url, files=files, data=data)

if response.status_code == 200:
    with open('redacted.png', 'wb') as f:
        f.write(response.content)
    print("Stats:", response.headers.get('X-Redacted-Stats'))
\`\`\`
