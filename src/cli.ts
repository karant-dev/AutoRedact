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

            if (!fs.existsSync(absoluteInputPath)) {
                console.error(chalk.red(`Error: Input file detection failed at ${absoluteInputPath} (Original: ${inputPath})`));
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
                    email: options.emails,
                    ip: options.ips,
                    creditCard: options.creditCards,
                    secret: options.secrets,
                    pii: options.pii,
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
            const base64Data = result.dataUrl.replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(outputPath, base64Data, 'base64');

            console.log(chalk.blue(`Saved to: ${outputPath}`));

        } catch (error) {
            console.error(chalk.red('\nFatal Error:'), error);
            process.exit(1);
        }
    });

program.parse();
