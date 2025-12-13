#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { NodeCanvasAdapter } from './adapters/NodeCanvasAdapter';
import { processImage } from './core/processor';
import { DEFAULT_ALLOWLIST } from './constants/config';
import type { DetectionSettings } from './types';

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
            // Commander 7+ handles variadic args if specified, or we might need to handle it differently depending on version.
            // Assuming string[] if repeated, or string if once.
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

            const result = await processImage(absoluteInputPath, {
                canvasFactory: adapter,
                detectionSettings: {
                    email: options.emails !== false,
                    ip: options.ips !== false,
                    creditCard: options.creditCards !== false,
                    secret: options.secrets !== false,
                    pii: options.pii !== false,
                    allowlist: allowlist,
                    blockWords: blockWords,
                    customDates: customDates,
                    customRegex: customRegexRules
                },
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
                // Fix for 'npm run': Resolve relative output path against user's CWD
                outputPath = path.resolve(currentDir, outputPath);
            } else {
                const dir = path.dirname(absoluteInputPath); // Use absolute input path's dir
                const ext = path.extname(absoluteInputPath);
                const name = path.basename(absoluteInputPath, ext);
                outputPath = path.join(dir, `redacted-${name}.png`);
            }

            // Convert base64 dataUrl to buffer and save
            const match = result.dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.*)$/);
            if (!match) {
                throw new Error("Invalid data URL format returned from processor");
            }
            const base64Data = match[1];

            try {
                fs.writeFileSync(outputPath, base64Data, 'base64');
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(chalk.red(`Failed to write output to ${outputPath}: ${message}`));
                process.exit(1);
            }

            console.log(chalk.blue(`Saved to: ${outputPath}`));

        } catch (error) {
            console.error(chalk.red('\nFatal Error:'), error);
            process.exit(1);
        }
    });

program.parse();
