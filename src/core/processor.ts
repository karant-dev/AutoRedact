import { createWorker } from 'tesseract.js';
import type { DetectedItem, DetectionSettings } from '../types';
import type { ICanvasFactory, AbstractImage } from './interfaces';
import { preprocessImage } from './image-processing';
import {
    findMatches,
    findBlockWordMatches,
    findCustomDateMatches,
    findCustomRegexMatches,
    filterAllowlistedMatches,
    hasValidOverlap
} from './matcher';
import { SENSITIVE_PATTERNS } from '../constants/patterns';
import { DEFAULT_ALLOWLIST } from '../constants/config';

// Default settings
const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
    email: true,
    ip: true,
    creditCard: true,
    secret: true,
    pii: true,
    allowlist: DEFAULT_ALLOWLIST,
    blockWords: [],
    customDates: [],
    customRegex: [],
};

export interface ProcessImageOptions {
    canvasFactory: ICanvasFactory;
    onProgress?: (progress: number) => void;
    detectionSettings?: DetectionSettings;
}

export interface ScanResult {
    detectedCount: number;
    detectedBreakdown: {
        emails: number;
        ips: number;
        creditCards: number;
        secrets: number;
        pii: number;
    };
    dataUrl: string;
}

export const processImage = async (
    source: string | Blob | File | Buffer,
    options: ProcessImageOptions
): Promise<ScanResult> => {
    const {
        canvasFactory,
        onProgress,
        detectionSettings = DEFAULT_DETECTION_SETTINGS
    } = options;

    // 1. Load Image using Adapter
    // Returns an abstract image object (HTMLImageElement in browser, Image in node-canvas)
    const img = await canvasFactory.loadImage(source);

    // 2. Prepare Canvas Dimensions (Upscale 2x for OCR)
    const scale = 2;
    // In BrowserAdapter, img has naturalWidth/Height. In Node, it acts similarly.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const width = (img as any).naturalWidth || (img as any).width;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const height = (img as any).naturalHeight || (img as any).height;

    // Validate dimensions
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
        throw new Error('Invalid image dimensions: width and height must be positive numbers');
    }

    const upscaledW = width * scale;
    const upscaledH = height * scale;

    // 3. Create Canvases
    const upscaledCanvas = canvasFactory.createCanvas(upscaledW, upscaledH);
    const upscaledCtx = upscaledCanvas.getContext('2d');

    const ocrCanvas = canvasFactory.createCanvas(upscaledW, upscaledH);
    const ocrCtx = ocrCanvas.getContext('2d');

    if (!upscaledCtx || !ocrCtx) {
        throw new Error('Failed to create canvas contexts');
    }

    // 4. Draw & Preprocess
    // Layer 1: Draw original to upscaled (Color version)
    upscaledCtx.drawImage(img, 0, 0, upscaledW, upscaledH);

    // Layer 2: Copy to OCR canvas
    ocrCtx.drawImage(upscaledCanvas as unknown as AbstractImage, 0, 0);

    // Layer 3: Apply Preprocessing (B&W) to OCR canvas only
    preprocessImage(ocrCtx, upscaledW, upscaledH);
    const ocrUrl = ocrCanvas.toDataURL('image/png');

    // 5. Run Tesseract (WASM/Node)
    const worker = await createWorker('eng', 1, {
        logger: (m) => {
            if (m.status === 'recognizing text' && onProgress) {
                onProgress(m.progress * 100);
            }
        },
    });

    const result = await worker.recognize(ocrUrl, {}, { blocks: true });

    // 6. Detection Logic
    const detected: DetectedItem[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result.data as any;
    const fullText = data.text || '';

    // --- MATCHING LOGIC (Copied from utils/ocr.ts) ---
    const emailMatches = detectionSettings.email ? findMatches(SENSITIVE_PATTERNS.email, fullText, 'email') : [];

    const ipv4Matches = detectionSettings.ip ? findMatches(SENSITIVE_PATTERNS.ipv4, fullText, 'ip').filter(m => m.text.split('.').length === 4) : [];
    const ipv6Matches = detectionSettings.ip ? findMatches(SENSITIVE_PATTERNS.ipv6, fullText, 'ip') : [];
    const macMatches = detectionSettings.ip ? findMatches(SENSITIVE_PATTERNS.mac, fullText, 'ip') : [];
    const ipMatches = [...ipv4Matches, ...ipv6Matches, ...macMatches];

    const ccBasicMatches = detectionSettings.creditCard ? findMatches(SENSITIVE_PATTERNS.creditCard, fullText, 'creditCard') : [];
    const ibanMatches = detectionSettings.creditCard ? findMatches(SENSITIVE_PATTERNS.iban, fullText, 'creditCard') : [];
    const btcMatches = detectionSettings.creditCard ? findMatches(SENSITIVE_PATTERNS.bitcoin, fullText, 'creditCard') : [];
    const ccMatches = [...ccBasicMatches, ...ibanMatches, ...btcMatches];

    const ssnMatches = detectionSettings.pii ? findMatches(SENSITIVE_PATTERNS.ssn, fullText, 'pii') : [];
    const panMatches = detectionSettings.pii ? findMatches(SENSITIVE_PATTERNS.pan, fullText, 'pii') : [];
    const piiMatches = [...ssnMatches, ...panMatches];

    let secretMatches: Array<{ text: string, type: DetectedItem['type'], index: number }> = [];
    if (detectionSettings.secret) {
        SENSITIVE_PATTERNS.secrets.forEach(pattern => {
            secretMatches = [...secretMatches, ...findMatches(pattern, fullText, 'secret')];
        });
    }

    const blockWordMatches = detectionSettings.blockWords?.length ? findBlockWordMatches(detectionSettings.blockWords, fullText, 'pii') : [];
    const customDateMatches = detectionSettings.customDates?.length ? findCustomDateMatches(detectionSettings.customDates, fullText, 'pii') : [];
    const customRegexMatches = detectionSettings.customRegex?.length ? findCustomRegexMatches(detectionSettings.customRegex, fullText, 'pii') : [];
    const customMatches = [...blockWordMatches, ...customDateMatches, ...customRegexMatches];

    // Filter
    const allowlist = detectionSettings.allowlist || [];
    const filteredEmailMatches = filterAllowlistedMatches(emailMatches, allowlist);
    const filteredIpMatches = filterAllowlistedMatches(ipMatches, allowlist);
    const filteredCcMatches = filterAllowlistedMatches(ccMatches, allowlist);
    const filteredPiiMatches = filterAllowlistedMatches(piiMatches, allowlist);
    const filteredSecretMatches = filterAllowlistedMatches(secretMatches, allowlist);
    const filteredCustomMatches = filterAllowlistedMatches(customMatches, allowlist);

    const allMatches = [...filteredEmailMatches, ...filteredIpMatches, ...filteredCcMatches, ...filteredPiiMatches, ...filteredSecretMatches, ...filteredCustomMatches];

    // Stats
    const detectedBreakdown = {
        emails: filteredEmailMatches.length,
        ips: filteredIpMatches.length,
        creditCards: filteredCcMatches.length,
        secrets: filteredSecretMatches.length,
        pii: filteredPiiMatches.length + filteredCustomMatches.length,
    };
    const detectedCount = Object.values(detectedBreakdown).reduce((a, b) => a + b, 0);

    // 7. Bounding Box Mapping
    const blocks = data.blocks || [];
    if (blocks.length > 0) {
        let cursor = 0;
        for (const block of blocks) {
            for (const paragraph of (block.paragraphs || [])) {
                for (const line of (paragraph.lines || [])) {
                    for (const word of (line.words || [])) {
                        const wordText = word.text?.trim();
                        if (!wordText) continue;

                        const index = fullText.indexOf(wordText, cursor);
                        if (index !== -1) {
                            const wordStart = index;
                            const wordEnd = index + wordText.length;
                            const match = allMatches.find(m =>
                                hasValidOverlap(wordStart, wordEnd, wordText, m.index, m.index + m.text.length, m.text)
                            );

                            if (match) {
                                detected.push({ text: wordText, type: match.type, bbox: word.bbox });
                            }
                            cursor = wordEnd;
                        }
                    }
                }
            }
        }
    }

    await worker.terminate();

    // 8. Redact (Draw on Upscaled Canvas)
    upscaledCtx.fillStyle = '#000000';
    detected.forEach(item => {
        const { x0, y0, x1, y1 } = item.bbox;
        upscaledCtx.fillRect(x0 - 2, y0 - 2, (x1 - x0) + 4, (y1 - y0) + 4);
    });

    // 9. Downscale / Output
    const outputCanvas = canvasFactory.createCanvas(width, height);
    const outputCtx = outputCanvas.getContext('2d');
    if (outputCtx) {
        // Safe cast via unknown: strictly ICanvas might differ from what drawImage expects in some envs
        outputCtx.drawImage(upscaledCanvas as unknown as AbstractImage, 0, 0, width, height);
    }

    return {
        detectedCount,
        detectedBreakdown,
        dataUrl: outputCanvas.toDataURL('image/png'),
    };
};
