import type { ICanvasFactory, ICanvas, AbstractImage } from '../core/interfaces';

export class BrowserCanvasAdapter implements ICanvasFactory {
    createCanvas(width: number, height: number): ICanvas {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas as unknown as ICanvas; // HTMLCanvasElement satisfies ICanvas structure
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loadImage(source: string | any): Promise<AbstractImage> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            if (typeof source === 'string') {
                img.src = source;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } else if ((source as any) instanceof Blob || (source as any) instanceof File) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                img.src = URL.createObjectURL(source as any);
            } else {
                reject(new Error('Invalid source type'));
                return;
            }

            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
        });
    }
}
