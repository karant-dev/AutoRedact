import { useState } from 'react';
import type { BatchItem, BatchProgress, DetectionSettings } from '../types';
import { processPdfFile } from '../utils/pdf';
import { processImageForBatch } from '../utils/ocr';
import { downloadBatchAsZip, downloadBatchAsPdf } from '../utils/exporters';

export function useBatch(detectionSettings: DetectionSettings) {
    const [batchMode, setBatchMode] = useState(false);
    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [batchProgress, setBatchProgress] = useState<BatchProgress>({
        current: 0,
        total: 0,
        isProcessing: false,
    });

    const resetBatch = () => {
        setBatchItems([]);
        setBatchMode(false);
        setBatchProgress({ current: 0, total: 0, isProcessing: false });
    };

    // Handle batch file selection (unified for images and PDFs)
    const handleBatchFiles = async (files: FileList | File[]) => {
        const fileArray = Array.isArray(files) ? files : Array.from(files);

        // Separate images and PDFs
        const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
        const pdfFiles = fileArray.filter(f => f.type === 'application/pdf');

        // Create initial batch items for images
        const imageItems: BatchItem[] = imageFiles.map((file) => ({
            id: `img-${Date.now()}-${file.name}`,
            file,
            status: 'pending',
            detectedCount: 0,
            detectedBreakdown: { emails: 0, ips: 0, creditCards: 0, secrets: 0, pii: 0 },
            dataUrl: null,
        }));

        // Process PDFs and create batch items for each page
        let pdfItems: BatchItem[] = [];
        if (pdfFiles.length > 0) {
            for (const pdfFile of pdfFiles) {
                const result = await processPdfFile(pdfFile);
                if (result.error) {
                    alert(`PDF Error: ${result.error}`);
                } else {
                    pdfItems = [...pdfItems, ...result.items];
                }
            }
        }

        const allItems = [...imageItems, ...pdfItems];
        if (allItems.length === 0) return;

        setBatchItems(allItems);
        setBatchMode(true);
        // Auto-start processing
        setTimeout(() => processBatchImages(allItems), 100);
    };

    // Process all batch images
    const processBatchImages = async (itemsToProcess = batchItems) => {
        if (itemsToProcess.length === 0) return;

        setBatchProgress({ current: 0, total: itemsToProcess.length, isProcessing: true });

        for (let i = 0; i < itemsToProcess.length; i++) {
            const item = itemsToProcess[i];

            // Update status to processing
            setBatchItems(prev => prev.map(b =>
                b.id === item.id ? { ...b, status: 'processing' as const } : b
            ));

            try {
                const result = await processImageForBatch(item.file, { detectionSettings });

                // Update with result
                setBatchItems(prev => prev.map(b =>
                    b.id === item.id ? {
                        ...b,
                        status: 'complete' as const,
                        detectedCount: result.detectedCount,
                        detectedBreakdown: result.detectedBreakdown,
                        dataUrl: result.dataUrl,
                    } : b
                ));
            } catch (error) {
                console.error(`Error processing ${item.file.name}:`, error);
                setBatchItems(prev => prev.map(b =>
                    b.id === item.id ? { ...b, status: 'error' as const } : b
                ));
            }

            setBatchProgress(prev => ({ ...prev, current: i + 1 }));
        }

        setBatchProgress(prev => ({ ...prev, isProcessing: false }));
    };

    const handleDownloadZip = () => downloadBatchAsZip(batchItems);
    const handleDownloadPdf = () => downloadBatchAsPdf(batchItems);

    return {
        batchMode,
        batchItems,
        batchProgress,
        handleBatchFiles,
        processBatchImages: () => processBatchImages(batchItems), // Wrapper for manual trigger
        resetBatch,
        handleDownloadZip,
        handleDownloadPdf,
    };
}
