import { createWorker } from 'tesseract.js';
import type { DetectedItem, DetectionSettings } from '../types';
import { SENSITIVE_PATTERNS } from '../constants/patterns';
import { DEFAULT_ALLOWLIST } from '../constants/config';
import { preprocessImage } from './canvas';

// Helper: find all pattern matches with their positions
export const findMatches = (pattern: RegExp, text: string, type: DetectedItem['type']): Array<{ text: string, type: DetectedItem['type'], index: number }> => {
    pattern.lastIndex = 0;
    const matches: Array<{ text: string, type: DetectedItem['type'], index: number }> = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
        matches.push({ text: match[0], type, index: match.index });
    }
    return matches;
};

// Helper: check if a text matches any allowlisted value (case-insensitive)
export const isAllowlisted = (text: string, allowlist: string[]): boolean => {
    const lowerText = text.toLowerCase();
    return allowlist.some(allowed => allowed.toLowerCase() === lowerText);
};

// Helper: filter matches against allowlist
export const filterAllowlistedMatches = <T extends { text: string }>(
    matches: T[],
    allowlist: string[]
): T[] => {
    return matches.filter(match => !isAllowlisted(match.text, allowlist));
};

// Default settings for backward compatibility (all enabled)
const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
    email: true,
    ip: true,
    creditCard: true,
    secret: true,
    pii: true,
    allowlist: DEFAULT_ALLOWLIST,
};

interface ProcessImageOptions {
    onProgress?: (progress: number) => void;
    detectionSettings?: DetectionSettings;
}

// Process a single image and return canvas data URL (for batch processing)
export const processImageForBatch = async (
    file: File,
    options: ProcessImageOptions = {}
): Promise<{ detectedCount: number; detectedBreakdown: { emails: number; ips: number; creditCards: number; secrets: number; pii: number }; dataUrl: string }> => {
    const { onProgress, detectionSettings = DEFAULT_DETECTION_SETTINGS } = options;
    // Create image URL
    const url = URL.createObjectURL(file);

    // Load image
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
    });

    // Upscale image to 2x for better OCR accuracy (matching PDF behavior)
    const scale = 2;
    const upscaledCanvas = document.createElement('canvas');
    upscaledCanvas.width = img.naturalWidth * scale;
    upscaledCanvas.height = img.naturalHeight * scale;
    const upscaledCtx = upscaledCanvas.getContext('2d');

    // Create a separate canvas for OCR preprocessing (Grayscale/B&W)
    const ocrCanvas = document.createElement('canvas');
    ocrCanvas.width = upscaledCanvas.width;
    ocrCanvas.height = upscaledCanvas.height;
    const ocrCtx = ocrCanvas.getContext('2d');

    let ocrUrl = '';

    if (upscaledCtx && ocrCtx) {
        // 1. Draw original image to upscaled canvas (This keeps the color version for display)
        upscaledCtx.drawImage(img, 0, 0, upscaledCanvas.width, upscaledCanvas.height);

        // 2. Copy to OCR canvas
        ocrCtx.drawImage(upscaledCanvas, 0, 0);

        // 3. Apply preprocessing ONLY to OCR canvas
        preprocessImage(ocrCtx, ocrCanvas.width, ocrCanvas.height);
        ocrUrl = ocrCanvas.toDataURL('image/png');
    }

    // Create worker
    const worker = await createWorker('eng', 1, {
        logger: (m) => {
            if (m.status === 'recognizing text' && onProgress) {
                onProgress(m.progress * 100);
            }
        },
    });

    // Run OCR on the PREPROCESSED (B&W) image
    const result = await worker.recognize(ocrUrl, {}, { blocks: true });

    // Find sensitive data
    const detected: DetectedItem[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result.data as any;
    const fullText = data.text || '';
    console.log('Detected Text (Batch):', fullText);

    // 1. Email Matches (filtered by settings)
    const emailMatches = detectionSettings.email
        ? findMatches(SENSITIVE_PATTERNS.email, fullText, 'email')
        : [];

    // 2. IP Matches (IPv4 + IPv6 + MAC) (filtered by settings)
    const ipv4Matches = detectionSettings.ip
        ? findMatches(SENSITIVE_PATTERNS.ipv4, fullText, 'ip').filter(m => m.text.split('.').length === 4)
        : [];
    const ipv6Matches = detectionSettings.ip
        ? findMatches(SENSITIVE_PATTERNS.ipv6, fullText, 'ip')
        : [];
    const macMatches = detectionSettings.ip
        ? findMatches(SENSITIVE_PATTERNS.mac, fullText, 'ip')
        : [];
    const ipMatches = [...ipv4Matches, ...ipv6Matches, ...macMatches];

    // 3. Credit Card Matches (Finance) (filtered by settings)
    const ccBasicMatches = detectionSettings.creditCard
        ? findMatches(SENSITIVE_PATTERNS.creditCard, fullText, 'creditCard')
        : [];
    const ibanMatches = detectionSettings.creditCard
        ? findMatches(SENSITIVE_PATTERNS.iban, fullText, 'creditCard')
        : [];
    const btcMatches = detectionSettings.creditCard
        ? findMatches(SENSITIVE_PATTERNS.bitcoin, fullText, 'creditCard')
        : [];
    const ccMatches = [...ccBasicMatches, ...ibanMatches, ...btcMatches];

    // 4. PII Matches (SSN, PAN) (filtered by settings)
    const ssnMatches = detectionSettings.pii
        ? findMatches(SENSITIVE_PATTERNS.ssn, fullText, 'pii')
        : [];
    const panMatches = detectionSettings.pii
        ? findMatches(SENSITIVE_PATTERNS.pan, fullText, 'pii')
        : [];
    const piiMatches = [...ssnMatches, ...panMatches];

    // 5. Secrets Matches (All patterns in the array) (filtered by settings)
    let secretMatches: Array<{ text: string, type: DetectedItem['type'], index: number }> = [];
    if (detectionSettings.secret) {
        SENSITIVE_PATTERNS.secrets.forEach(pattern => {
            secretMatches = [...secretMatches, ...findMatches(pattern, fullText, 'secret')];
        });
    }

    // Apply allowlist filtering to all match types
    const allowlist = detectionSettings.allowlist || [];
    const filteredEmailMatches = filterAllowlistedMatches(emailMatches, allowlist);
    const filteredIpMatches = filterAllowlistedMatches(ipMatches, allowlist);
    const filteredCcMatches = filterAllowlistedMatches(ccMatches, allowlist);
    const filteredPiiMatches = filterAllowlistedMatches(piiMatches, allowlist);
    const filteredSecretMatches = filterAllowlistedMatches(secretMatches, allowlist);

    const allMatches = [...filteredEmailMatches, ...filteredIpMatches, ...filteredCcMatches, ...filteredPiiMatches, ...filteredSecretMatches];

    console.log(`[Batch] Matches for ${file.name}:`, {
        emails: filteredEmailMatches.map(m => m.text),
        ips: filteredIpMatches.map(m => m.text),
        creditCards: filteredCcMatches.map(m => m.text),
        secrets: filteredSecretMatches.map(m => m.text),
        pii: filteredPiiMatches.map(m => m.text),
    });

    // Create Stats Breakdown (Count actual entities, not redaction boxes)
    const detectedBreakdown = {
        emails: filteredEmailMatches.length,
        ips: filteredIpMatches.length,
        creditCards: filteredCcMatches.length,
        secrets: filteredSecretMatches.length,
        pii: filteredPiiMatches.length,
    };
    const detectedCount = Object.values(detectedBreakdown).reduce((a, b) => a + b, 0);

    const blocks = data.blocks || [];
    if (blocks.length > 0) {
        let cursor = 0;
        for (const block of blocks) {
            for (const paragraph of (block.paragraphs || [])) {
                for (const line of (paragraph.lines || [])) {
                    for (const word of (line.words || [])) {
                        const wordText = word.text?.trim();
                        if (!wordText) continue;

                        // Positional Mapping: Find word location in fullText
                        // Use cursor to ensures we match the correct instance of valid words
                        const index = fullText.indexOf(wordText, cursor);

                        if (index !== -1) {
                            const wordStart = index;
                            const wordEnd = index + wordText.length;

                            // Check for spatial overlap with any sensitive match
                            // Overlap condition: (StartA < EndB) and (EndA > StartB)
                            const match = allMatches.find(m => {
                                const matchStart = m.index;
                                const matchEnd = m.index + m.text.length;
                                return wordStart < matchEnd && wordEnd > matchStart;
                            });

                            if (match) {
                                detected.push({ text: wordText, type: match.type, bbox: word.bbox });
                            }

                            // Advance cursor
                            cursor = wordEnd;
                        }
                    }
                }
            }
        }
    }

    await worker.terminate();

    // Draw redactions on upscaled canvas (OCR coordinates are in upscaled space)
    if (upscaledCtx) {
        upscaledCtx.fillStyle = '#000000';
        detected.forEach(item => {
            const { x0, y0, x1, y1 } = item.bbox;
            upscaledCtx.fillRect(x0 - 2, y0 - 2, (x1 - x0) + 4, (y1 - y0) + 4);
        });
    }

    // Scale back down to original size for final output
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = img.naturalWidth;
    outputCanvas.height = img.naturalHeight;
    const outputCtx = outputCanvas.getContext('2d');
    if (outputCtx) {
        outputCtx.drawImage(upscaledCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
    }

    // Cleanup
    URL.revokeObjectURL(url);

    return {
        detectedCount,
        detectedBreakdown,
        dataUrl: outputCanvas.toDataURL('image/png'),
    };
};
