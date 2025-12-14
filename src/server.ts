import fastify from 'fastify';
import multipart from '@fastify/multipart';
import { processImage } from './core/processor';
import { NodeCanvasAdapter } from './adapters/NodeCanvasAdapter';
import type { DetectionSettings } from './types';

import { DEFAULT_ALLOWLIST } from './constants/config';

const server = fastify({ logger: true });

// Register multipart support for file uploads
server.register(multipart, {
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    }
});

// Adapter instance (reused)
const adapter = new NodeCanvasAdapter();

server.get('/health', async () => {
    return { status: 'ok', version: process.env.npm_package_version || 'unknown' };
});

server.post('/redact', async (req, reply) => {
    const parts = req.parts();
    let imageBuffer: Buffer | undefined;
    let settings: DetectionSettings = {
        email: true,
        ip: true,
        creditCard: true,
        secret: true,
        pii: true,
        allowlist: [...DEFAULT_ALLOWLIST],
        blockWords: [],
        customDates: [],
        customRegex: []
    };

    try {
        for await (const part of parts) {
            if (part.type === 'file' && part.fieldname === 'image') {
                if (!['image/jpeg', 'image/png'].includes(part.mimetype)) {
                    // We continue to consume the stream to avoid hanging, but note the error
                    // Or just throw immediately if we want to fail fast
                    throw new Error('Only .jpg and .png files are supported');
                }
                imageBuffer = await part.toBuffer();
            } else if (part.type === 'field' && part.fieldname === 'settings') {
                try {
                    const parsed = JSON.parse(part.value as string);
                    settings = { ...settings, ...parsed };
                } catch {
                    req.log.warn('Failed to parse settings JSON');
                }
            }
        }

        if (!imageBuffer) {
            return reply.code(400).send({ error: 'No image file uploaded' });
        }

        const result = await processImage(imageBuffer, {
            canvasFactory: adapter,
            detectionSettings: settings,
        });

        // Convert DataURL to Buffer
        const match = result.dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.*)$/);
        if (!match) throw new Error("Processing failed to generate valid image");

        const outputBuffer = Buffer.from(match[1], 'base64');

        // Return stats in headers
        reply.header('X-Redacted-Stats', JSON.stringify(result.detectedBreakdown));
        reply.type('image/png');
        return outputBuffer;

    } catch (err: unknown) {
        req.log.error(err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        const status = errorMessage.includes('supported') ? 400 : 500;
        return reply.code(status).send({ error: errorMessage || 'Redaction processing failed' });
    }
});

const start = async () => {
    try {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server running on http://0.0.0.0:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
