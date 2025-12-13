
// Abstract image type (Platform dependent: HTMLImageElement or Node Canvas Image)
export type AbstractImage = unknown;

export interface ICanvasContext {
    drawImage(image: AbstractImage, dx: number, dy: number, dw?: number, dh?: number): void;
    getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
    putImageData(imageData: ImageData, dx: number, dy: number): void;
    fillStyle: string | CanvasGradient | CanvasPattern;
    fillRect(x: number, y: number, w: number, h: number): void;
}

export interface ICanvas {
    width: number;
    height: number;
    getContext(contextId: '2d'): ICanvasContext | null;
    toDataURL(type?: string): string;
}

export interface ICanvasFactory {
    createCanvas(width: number, height: number): ICanvas;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loadImage(source: string | any): Promise<AbstractImage>;
}
