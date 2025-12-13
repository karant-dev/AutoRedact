import type { ICanvasFactory, ICanvas, AbstractImage } from '../core/interfaces';

export class BrowserCanvasAdapter implements ICanvasFactory {
    createCanvas(width: number, height: number): ICanvas {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas as unknown as ICanvas; // HTMLCanvasElement satisfies ICanvas structure
    }

    loadImage(source: string | Blob | File | Buffer): Promise<AbstractImage> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            let objectUrl: string | null = null;

            if (typeof source === 'string') {
                img.src = source;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } else if ((source as any) instanceof Blob || (source as any) instanceof File) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                objectUrl = URL.createObjectURL(source as any);
                img.src = objectUrl;
            } else {
                reject(new Error('Invalid source type'));
                return;
            }

            img.onload = () => {
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                resolve(img);
            };
            img.onerror = () => {
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                reject(new Error('Failed to load image'));
            };
        });
    }
}
