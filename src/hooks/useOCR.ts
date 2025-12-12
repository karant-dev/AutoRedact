import { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import type { DetectedItem, ProcessingState, DetectionSettings } from '../types';
import { SENSITIVE_PATTERNS } from '../constants/patterns';
import { findMatches, filterAllowlistedMatches } from '../utils/ocr';
import { preprocessImage } from '../utils/canvas';

export function useOCR(detectionSettings: DetectionSettings) {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
    const [processingState, setProcessingState] = useState<ProcessingState>({
        status: 'idle',
        progress: 0,
        message: '',
    });

    const [detectionStats, setDetectionStats] = useState({
        emails: 0,
        ips: 0,
        creditCards: 0,
        secrets: 0,
        pii: 0,
    });

    const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

    const reset = useCallback(() => {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        setImageFile(null);
        setImageUrl(null);
        setDetectedItems([]);
        setDetectionStats({ emails: 0, ips: 0, creditCards: 0, secrets: 0, pii: 0 });
        setProcessingState({ status: 'idle', progress: 0, message: '' });
        setLoadedImage(null);
    }, [imageUrl]);

    const processImage = async (file: File) => {
        setImageFile(file);
        setProcessingState({
            status: 'loading',
            progress: 0,
            message: 'Loading image...',
        });

        // Create image URL
        const url = URL.createObjectURL(file);
        setImageUrl(url);

        // Load image
        const img = new Image();
        img.src = url;

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image'));
        });

        setLoadedImage(img);

        setProcessingState({
            status: 'scanning',
            progress: 10,
            message: 'Initializing OCR engine...',
        });

        try {
            // Upscale image to 2x for better OCR accuracy
            const scale = 2;
            const upscaledCanvas = document.createElement('canvas');
            upscaledCanvas.width = img.naturalWidth * scale;
            upscaledCanvas.height = img.naturalHeight * scale;
            const upscaledCtx = upscaledCanvas.getContext('2d');
            if (upscaledCtx) {
                upscaledCtx.drawImage(img, 0, 0, upscaledCanvas.width, upscaledCanvas.height);

                // Apply preprocessing (Grayscale + Binarization) to clean up noise
                preprocessImage(upscaledCtx, upscaledCanvas.width, upscaledCanvas.height);
            }
            const upscaledUrl = upscaledCanvas.toDataURL('image/png');

            // Create Tesseract worker
            const worker = await createWorker('eng', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        setProcessingState({
                            status: 'scanning',
                            progress: 10 + (m.progress * 70),
                            message: `Scanning for text... ${Math.round(m.progress * 100)}%`,
                        });
                    }
                },
            });

            // Run OCR on upscaled & preprocessed image
            // Must pass { blocks: true } as third argument to recognize()
            const result = await worker.recognize(upscaledUrl, {}, { blocks: true });

            setProcessingState({
                status: 'redacting',
                progress: 85,
                message: 'Detecting sensitive data...',
            });

            // Find sensitive data from blocks structure
            const detected: DetectedItem[] = [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = result.data as any;
            const fullText = data.text || '';

            console.log('=== OCR TEXT-BASED DETECTION ===');
            console.log('Detected Text:', fullText);

            // Find all sensitive items in the full text (filtered by settings)
            const emailMatches = detectionSettings.email
                ? findMatches(SENSITIVE_PATTERNS.email, fullText, 'email')
                : [];
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

            const ssnMatches = detectionSettings.pii
                ? findMatches(SENSITIVE_PATTERNS.ssn, fullText, 'pii')
                : [];
            const panMatches = detectionSettings.pii
                ? findMatches(SENSITIVE_PATTERNS.pan, fullText, 'pii')
                : [];
            const piiMatches = [...ssnMatches, ...panMatches];

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

            // Update stats with Entity counts
            setDetectionStats({
                emails: filteredEmailMatches.length,
                ips: filteredIpMatches.length,
                creditCards: filteredCcMatches.length,
                secrets: filteredSecretMatches.length,
                pii: filteredPiiMatches.length,
            });

            // Use blocks for precise redaction with Positional Mapping
            const blocks = data.blocks || [];
            if (blocks.length > 0) {
                let cursor = 0;

                for (const block of blocks) {
                    const paragraphs = block.paragraphs || [];
                    for (const paragraph of paragraphs) {
                        const lines = paragraph.lines || [];
                        for (const line of lines) {
                            const words = line.words || [];
                            for (const word of words) {
                                const wordText = word.text?.trim();
                                if (!wordText) continue;

                                // Positional Mapping: Find word location in fullText matching cursor
                                const index = fullText.indexOf(wordText, cursor);

                                if (index !== -1) {
                                    const wordStart = index;
                                    const wordEnd = index + wordText.length;

                                    // Check overlap
                                    const match = allMatches.find(m => {
                                        const mStart = m.index;
                                        const mEnd = m.index + m.text.length;
                                        return wordStart < mEnd && wordEnd > mStart;
                                    });

                                    if (match) {
                                        const bbox = word.bbox;
                                        detected.push({
                                            text: wordText,
                                            type: match.type,
                                            bbox: {
                                                x0: bbox.x0 / scale,
                                                y0: bbox.y0 / scale,
                                                x1: bbox.x1 / scale,
                                                y1: bbox.y1 / scale,
                                            }
                                        });
                                    }

                                    // Update cursor
                                    cursor = wordEnd;
                                }
                            }
                        }
                    }
                }
            } else {
                // Fallback: Create estimated bounding boxes based on text lines
                const lines = fullText.split('\n').filter((l: string) => l.trim().length > 0);
                const imgHeight = img.naturalHeight;
                const imgWidth = img.naturalWidth;

                const leftMargin = Math.floor(imgWidth * 0.03);
                const topMargin = Math.floor(imgHeight * 0.03);
                const textAreaWidth = imgWidth - (leftMargin * 2);
                const textAreaHeight = imgHeight - (topMargin * 2);

                const maxLineLength = Math.max(...lines.map((l: string) => l.length), 60);
                const charWidth = Math.floor(textAreaWidth / maxLineLength);

                const allLines = fullText.split('\n');
                const lineHeight = Math.floor(textAreaHeight / Math.max(allLines.length, 1));

                let currentY = topMargin;
                for (const line of allLines) {
                    for (const match of allMatches) {
                        const matchIndex = line.indexOf(match.text);
                        if (matchIndex !== -1) {
                            const xPadding = charWidth * 2;
                            const yPadding = Math.floor(lineHeight * 0.1);

                            const x0 = leftMargin + (matchIndex * charWidth) - xPadding;
                            const x1 = x0 + (match.text.length * charWidth) + (xPadding * 2);

                            detected.push({
                                text: match.text,
                                type: match.type,
                                bbox: {
                                    x0: Math.max(0, x0),
                                    y0: Math.max(0, currentY - yPadding),
                                    x1: Math.min(imgWidth, x1),
                                    y1: Math.min(imgHeight, currentY + lineHeight + yPadding),
                                },
                            });
                        }
                    }
                    currentY += lineHeight;
                }
            }

            await worker.terminate();

            setDetectedItems(detected);
            setProcessingState({
                status: 'complete',
                progress: 100,
                message: `Found ${detected.length} sensitive item${detected.length !== 1 ? 's' : ''} to redact`,
            });

        } catch (error) {
            console.error('OCR Error:', error);
            setProcessingState({
                status: 'error',
                progress: 0,
                message: 'Failed to process image. Please try again.',
            });
        }
    };

    return {
        imageFile,
        imageUrl,
        detectedItems,
        processingState,
        detectionStats,
        loadedImage,
        processImage,
        reset,
    };
}
