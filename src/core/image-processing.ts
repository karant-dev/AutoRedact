import type { ICanvasContext } from './interfaces';

// Helper: Preprocess image for better OCR (Grayscale + Binarization)
export const preprocessImage = (ctx: ICanvasContext, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Contrast enhancement factor
    const contrast = 1.5;
    const intercept = 128 * (1 - contrast);

    for (let i = 0; i < data.length; i += 4) {
        // Handle transparency: If alpha is low, make it white
        if (data[i + 3] < 10) {
            data[i] = 255;     // R
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
            data[i + 3] = 255; // A
            continue;
        }

        // Convert to grayscale: L = 0.299R + 0.587G + 0.114B
        const avg = (0.299 * data[i]) + (0.587 * data[i + 1]) + (0.114 * data[i + 2]);

        // Apply contrast
        let value = (avg * contrast) + intercept;
        value = Math.max(0, Math.min(255, value));

        data[i] = value;     // R
        data[i + 1] = value; // G
        data[i + 2] = value; // B
        // Alpha remains unchanged
    }

    ctx.putImageData(imageData, 0, 0);
};
