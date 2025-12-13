import type { DetectedItem } from '../types';

// ============================================================================
// CANVAS DRAWING FUNCTIONS
// ============================================================================
export const drawImageToCanvas = (
    canvas: HTMLCanvasElement,
    img: HTMLImageElement,
    items: DetectedItem[]
) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Layer 1: Draw original image
    ctx.drawImage(img, 0, 0);

    // Layer 2: Draw redaction boxes
    ctx.fillStyle = '#000000';
    items.forEach(item => {
        const { x0, y0, x1, y1 } = item.bbox;
        const padding = 2;
        ctx.fillRect(
            x0 - padding,
            y0 - padding,
            (x1 - x0) + padding * 2,
            (y1 - y0) + padding * 2
        );
    });
};

// Helper: Preprocess image for better OCR (Grayscale + Binarization)
// Re-exported from core for backward compatibility
export { preprocessImage } from '../core/image-processing';
