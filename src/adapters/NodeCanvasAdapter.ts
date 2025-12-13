import { createCanvas, loadImage } from 'canvas';
import type { ICanvasFactory, ICanvas, AbstractImage } from '../core/interfaces';

export class NodeCanvasAdapter implements ICanvasFactory {
    createCanvas(width: number, height: number): ICanvas {
        // cast to unknown first, then to ICanvas to bridge node-canvas types and our interface
        const canvas = createCanvas(width, height);
        return canvas as unknown as ICanvas;
    }

    async loadImage(source: string | Blob | File | Buffer): Promise<AbstractImage> {
        // node-canvas loadImage accepts string (path) or Buffer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const img = await loadImage(source as any);
        return img;
    }
}
