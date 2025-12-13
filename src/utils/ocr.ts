import { BrowserCanvasAdapter } from '../adapters/BrowserCanvasAdapter';
import { processImage, type ProcessImageOptions } from '../core/processor';
import type { DetectionSettings } from '../types';

// Re-export helpers for backward compatibility
export {
    findMatches,
    findBlockWordMatches,
    findCustomDateMatches,
    findCustomRegexMatches,
    isAllowlisted,
    filterAllowlistedMatches,
    hasValidOverlap
} from '../core/matcher';

interface LegacyProcessImageOptions {
    onProgress?: (progress: number) => void;
    detectionSettings?: DetectionSettings;
}

// Wrapper for the new Core Processor using Browser Adapter
export const processImageForBatch = async (
    file: File,
    options: LegacyProcessImageOptions = {}
) => {
    const adapter = new BrowserCanvasAdapter();

    const coreOptions: ProcessImageOptions = {
        canvasFactory: adapter,
        onProgress: options.onProgress,
        detectionSettings: options.detectionSettings
    };

    return processImage(file, coreOptions);
};
