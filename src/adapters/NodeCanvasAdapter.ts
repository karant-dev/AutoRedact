import { createCanvas, loadImage } from 'canvas';
import type { ICanvasFactory, ICanvas, AbstractImage } from '../core/interfaces';

export class NodeCanvasAdapter implements ICanvasFactory {
    createCanvas(width: number, height: number): ICanvas {
        // cast to any because node-canvas keys slightly differ from strict DOM types but are compatible at runtime
        const canvas = createCanvas(width, height);
        return canvas as unknown as ICanvas;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async loadImage(source: string | any): Promise<AbstractImage> {
        // node-canvas loadImage accepts string (path) or Buffer
        const img = await loadImage(source);
        return img;
    }
}
