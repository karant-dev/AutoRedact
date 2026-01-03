
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const checkPdfDeps = async (): Promise<boolean> => {
    return new Promise((resolve) => {
        const check = spawn('pdftoppm', ['-v']);
        check.on('error', () => resolve(false));
        check.on('close', (code) => resolve(code === 0 || code === 127 ? false : true)); // 127 is usually command not found, but close might send other codes. simpler to check error or success.
        // Actually, 'command not found' usually emits 'error' with ENOENT on spawn, or exits with 127.
        // Let's refine:
    });
};

export const hasPdfDeps = async (): Promise<boolean> => {
    try {
        await new Promise((resolve, reject) => {
            const p = spawn('pdftoppm', ['-v']);
            p.on('error', reject);
            p.on('close', (code) => {
                if (code === 0) resolve(true);
                else reject(new Error(`Exit code ${code}`));
            });
        });
        return true;
    } catch {
        return false;
    }
};

export const convertPdfToImages = async (pdfPath: string): Promise<string[]> => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-redact-pdf-'));

    return new Promise((resolve, reject) => {
        const process = spawn('pdftoppm', [
            '-png',
            '-r', '300', // 300 DPI for good quality
            pdfPath,
            path.join(tempDir, 'page')
        ]);

        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`pdftoppm failed with code ${code}`));
                return;
            }

            // Read generated files
            try {
                const files = fs.readdirSync(tempDir)
                    .filter(f => f.startsWith('page') && f.endsWith('.png'))
                    .sort((a, b) => {
                        // Sort by page number
                        const numA = parseInt(a.match(/page-(\d+)\.png/)?.[1] || '0');
                        const numB = parseInt(b.match(/page-(\d+)\.png/)?.[1] || '0');
                        return numA - numB;
                    })
                    .map(f => path.join(tempDir, f));

                resolve(files);
            } catch (err) {
                reject(err);
            }
        });

        process.on('error', (err) => {
            reject(err);
        });
    });
};

export const cleanupTempDir = (dir: string) => {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
};

export const isPdfFile = (filePath: string): boolean => {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(5);
        fs.readSync(fd, buffer, 0, 5, 0);
        fs.closeSync(fd);
        // Check for %PDF- standard header
        return buffer.toString('ascii') === '%PDF-';
    } catch {
        return false;
    }
};
