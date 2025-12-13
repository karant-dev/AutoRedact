import fastify from 'fastify';
import multipart from '@fastify/multipart';
import { processImage } from './core/processor';
import { NodeCanvasAdapter } from './adapters/NodeCanvasAdapter';
import type { DetectionSettings } from './types';

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
    const data = await req.file();

    if (!data) {
        return reply.code(400).send({ error: 'No image file uploaded' });
    }

    if (!['image/jpeg', 'image/png'].includes(data.mimetype)) {
        return reply.code(400).send({ error: 'Only .jpg and .png files are supported' });
    }

    try {
        const buffer = await data.toBuffer();

        // Parse settings (optional)
        // Note: multipart fields come as streams or values. 
        // For simplicity, we can inspect other fields if parsed, 
        // but @fastify/multipart with req.file() iterates.
        // Let's attach settings via a specific header or query param for mvp, 
        // or parse fields if needed. 
        // Better: simple default settings for now, allow enhancement later.
        const settings: DetectionSettings = {
            email: true,
            ip: true,
            creditCard: true,
            secret: true,
            pii: true,
            // Default empty limits
            allowlist: [],
            blockWords: [],
            customDates: [],
            customRegex: []
        };

        const result = await processImage(buffer, {
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

    } catch (err) {
        req.log.error(err);
        return reply.code(500).send({ error: 'Redaction processing failed' });
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
