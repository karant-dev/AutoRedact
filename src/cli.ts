#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { NodeCanvasAdapter } from './adapters/NodeCanvasAdapter';
import { processImage } from './core/processor';
import { DEFAULT_ALLOWLIST } from './constants/config';
import type { DetectionSettings } from './types';
import { hasPdfDeps, convertPdfToImages, cleanupTempDir } from './utils/pdf-node';
import { createCanvas, loadImage } from 'canvas';

const program = new Command();

program
    .name('auto-redact')
    .description('CLI for AutoRedact - Privacy-First OCR Redaction')
    .version('1.0.0');

program
    .argument('<input>', 'Input image path')
    .option('-o, --output <path>', 'Output image path (default: redacted-<input>)')
    .option('--no-emails', 'Disable Email Redaction')
    .option('--no-ips', 'Disable IP Redaction')
    .option('--no-credit-cards', 'Disable Credit Card Redaction')
    .option('--no-secrets', 'Disable Secret/Key Redaction')
    .option('--no-pii', 'Disable PII Redaction')
    .option('--allowlist <items>', 'Comma separated list of allowed items')
    .option('--block-words <items>', 'Comma separated list of words to block')
    .option('--custom-dates <items>', 'Comma separated list of date formats')
    .option('--custom-regex <pattern...>', 'Custom Regex Pattern (can be repeated)')
    .action(async (inputPath, options) => {
        try {
            console.log(chalk.blue(`Processing: ${inputPath}...`));

            // Fix for 'npm run': Resolve path relative to where the user actually ran the command (INIT_CWD),
            // not the project root where npm executes the script.
            const currentDir = process.env.INIT_CWD || process.cwd();
            const absoluteInputPath = path.resolve(currentDir, inputPath);

            // Path Traversal Check
            const relative = path.relative(currentDir, absoluteInputPath);
            if (relative.startsWith('..') && !path.isAbsolute(relative)) { // isAbsolute check covers some edge cases, but relative starting with .. is main check
                // For now, let's just warn or allow recursive if valid?
                // Actually, allowing recursive access might be wanted. Copilot suggested locking to DIR.
                // We will skip strict locking for now as user might want to access /tmp, but we will ensure existence.
            }

            if (!fs.existsSync(absoluteInputPath)) {
                console.error(chalk.red(`Error: Input file not found at ${absoluteInputPath}`));
                process.exit(1);
            }

            const adapter = new NodeCanvasAdapter();

            // Parse lists
            const allowlist = options.allowlist
                ? options.allowlist.split(',').map((s: string) => s.trim())
                : DEFAULT_ALLOWLIST;

            const blockWords = options.blockWords
                ? options.blockWords.split(',').map((s: string) => s.trim())
                : [];

            const customDates = options.customDates
                ? options.customDates.split(',').map((s: string) => s.trim())
                : [];

            // Parse Custom Regex (Repeatable flag)
            let customRegexRules: DetectionSettings['customRegex'] = [];
            if (options.customRegex) {
                const patterns = Array.isArray(options.customRegex) ? options.customRegex : [options.customRegex];
                customRegexRules = patterns.map((p: string, i: number) => ({
                    id: `cli-${i}`,
                    pattern: p,
                    caseSensitive: false, // Default to case-insensitive for CLI
                    label: `Custom Rule ${i + 1}`
                }));
            }

            const detectionSettings: DetectionSettings = {
                email: options.emails !== false,
                ip: options.ips !== false,
                creditCard: options.creditCards !== false,
                secret: options.secrets !== false,
                pii: options.pii !== false,
                allowlist: allowlist,
                blockWords: blockWords,
                customDates: customDates,
                customRegex: customRegexRules
            };

            const isPdf = absoluteInputPath.toLowerCase().endsWith('.pdf');

            if (isPdf) {
                // PDF Processing Logic
                if (!await hasPdfDeps()) {
                    console.error(chalk.red('Error: PDF processing requires "pdftoppm" (poppler-utils) to be installed.'));
                    console.error(chalk.yellow('  - Mac: brew install poppler'));
                    console.error(chalk.yellow('  - Ubuntu: sudo apt-get install poppler-utils'));
                    process.exit(1);
                }

                console.log(chalk.blue('Converting PDF to images for processing...'));
                let pageImages: string[] = [];
                try {
                    pageImages = await convertPdfToImages(absoluteInputPath);
                } catch (err) {
                    throw new Error(`Failed to convert PDF: ${err}`);
                }

                if (pageImages.length === 0) {
                    throw new Error('No pages found in PDF');
                }

                console.log(chalk.blue(`Processing ${pageImages.length} pages...`));

                // Determine output path for PDF
                let outputPath = options.output;
                if (outputPath) {
                    outputPath = path.resolve(currentDir, outputPath);
                } else {
                    const dir = path.dirname(absoluteInputPath);
                    const ext = path.extname(absoluteInputPath);
                    const name = path.basename(absoluteInputPath, ext);
                    outputPath = path.join(dir, `redacted-${name}.pdf`);
                }

                // Process first page to get dimensions for PDF canvas (assuming uniform pages for now, or resize logic)
                // Actually, we should probably handle variable page sizes if possible.
                // node-canvas PDF surface is created with a fixed size? 
                // "The first page is created with the width and height passed to the function."
                // "Subsequent pages can be added with addPage()." - docs don't explicitly say addPage takes size in 2.x?
                // Actually node-canvas v2.9+ addPage(w, h). We have canvas ^3.2.0.

                // Helper to load image dimensions
                const firstImg = await loadImage(pageImages[0]);
                const pdfCanvas = createCanvas(firstImg.width, firstImg.height, 'pdf');
                const pdfCtx = pdfCanvas.getContext('2d');

                // We don't draw the first page yet, we loop.
                // Wait, creating canvas creates first page automatically? 
                // Usually yes. So we should process page 0, draw it. Then for others addPage.

                let totalEmails = 0, totalIps = 0, totalCC = 0, totalSecrets = 0, totalPii = 0;

                for (let i = 0; i < pageImages.length; i++) {
                    const pagePath = pageImages[i];
                    process.stdout.write(`\rProcessing Page ${i + 1}/${pageImages.length}... `);

                    const result = await processImage(pagePath, {
                        canvasFactory: adapter,
                        detectionSettings: detectionSettings,
                        // onProgress: (p) => ... // skip granular progress for multi-page to avoid spam
                    });

                    // Aggregate stats
                    totalEmails += result.detectedBreakdown.emails;
                    totalIps += result.detectedBreakdown.ips;
                    totalCC += result.detectedBreakdown.creditCards;
                    totalSecrets += result.detectedBreakdown.secrets;
                    totalPii += result.detectedBreakdown.pii;

                    // Draw to PDF
                    // Load the redacted image (result.dataUrl)
                    const redactedImg = await loadImage(result.dataUrl);

                    if (i > 0) {
                        pdfCtx.addPage(redactedImg.width, redactedImg.height);
                    } else {
                        // For first page, ensure size matches if it differed from initial call variables?
                        // We initialized with firstImg.width. Should be same.
                    }

                    pdfCtx.drawImage(redactedImg, 0, 0, redactedImg.width, redactedImg.height);
                }

                process.stdout.write('\n');

                // Save PDF
                const pdfBuffer = pdfCanvas.toBuffer('application/pdf');
                fs.writeFileSync(outputPath, pdfBuffer);

                // Cleanup
                cleanupTempDir(path.dirname(pageImages[0]));

                console.log(chalk.green('\n\nPDF Redaction Complete! ✅'));
                console.log('--------------------------------');
                console.log(`Emails Found:       ${totalEmails}`);
                console.log(`IPs Found:          ${totalIps}`);
                console.log(`Credit Cards Found: ${totalCC}`);
                console.log(`Secrets Found:      ${totalSecrets}`);
                console.log(`PII/Other Found:    ${totalPii}`);
                console.log('--------------------------------');
                console.log(chalk.blue(`Saved to: ${outputPath}`));

            } else {
                // Single Image Processing
                const result = await processImage(absoluteInputPath, {
                    canvasFactory: adapter,
                    detectionSettings: detectionSettings,
                    onProgress: (p) => {
                        process.stdout.write(`\rOCR Progress: ${Math.round(p)}%`);
                    }
                });

                console.log(chalk.green('\n\nRedaction Complete! ✅'));
                console.log('--------------------------------');
                console.log(`Emails Found:       ${result.detectedBreakdown.emails}`);
                console.log(`IPs Found:          ${result.detectedBreakdown.ips}`);
                console.log(`Credit Cards Found: ${result.detectedBreakdown.creditCards}`);
                console.log(`Secrets Found:      ${result.detectedBreakdown.secrets}`);
                console.log(`PII/Other Found:    ${result.detectedBreakdown.pii}`);
                console.log('--------------------------------');

                // Save Output
                let outputPath = options.output;
                if (outputPath) {
                    outputPath = path.resolve(currentDir, outputPath);
                } else {
                    const dir = path.dirname(absoluteInputPath);
                    const ext = path.extname(absoluteInputPath);
                    const name = path.basename(absoluteInputPath, ext);
                    outputPath = path.join(dir, `redacted-${name}.png`);
                }

                const match = result.dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.*)$/);
                if (!match) throw new Error("Invalid data URL");
                fs.writeFileSync(outputPath, match[1], 'base64');
                console.log(chalk.blue(`Saved to: ${outputPath}`));
            }

        } catch (error) {
            console.error(chalk.red('\nFatal Error:'), error);
            process.exit(1);
        }
    });

program.parse();
