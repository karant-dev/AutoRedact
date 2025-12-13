import type { DetectedItem, DetectionSettings } from '../types';
import { generateDatePatterns } from '../utils/datePatterns'; // We might need to move this too

// Helper: find all pattern matches with their positions
export const findMatches = (pattern: RegExp, text: string, type: DetectedItem['type']): Array<{ text: string, type: DetectedItem['type'], index: number }> => {
    pattern.lastIndex = 0;
    const matches: Array<{ text: string, type: DetectedItem['type'], index: number }> = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
        matches.push({ text: match[0], type, index: match.index });
    }
    return matches;
};

// Helper: find block word matches (case-insensitive by default)
export const findBlockWordMatches = (
    blockWords: string[],
    text: string,
    type: DetectedItem['type']
): Array<{ text: string, type: DetectedItem['type'], index: number }> => {
    const matches: Array<{ text: string, type: DetectedItem['type'], index: number }> = [];
    for (const word of blockWords) {
        if (!word.trim()) continue;
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\b${escapedWord}\\b`, 'gi');
        let match;
        while ((match = pattern.exec(text)) !== null) {
            matches.push({ text: match[0], type, index: match.index });
        }
    }
    return matches;
};

// Helper: find custom date matches
export const findCustomDateMatches = (
    customDates: string[],
    text: string,
    type: DetectedItem['type']
): Array<{ text: string, type: DetectedItem['type'], index: number }> => {
    const matches: Array<{ text: string, type: DetectedItem['type'], index: number }> = [];
    for (const dateStr of customDates) {
        // Note: generateDatePatterns is currently in utils, we might need to import it or move it
        const patterns = generateDatePatterns(dateStr);
        for (const pattern of patterns) {
            pattern.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(text)) !== null) {
                const matchIndex = match.index;
                const matchText = match[0];
                const exists = matches.some(m => m.index === matchIndex && m.text === matchText);
                if (!exists) {
                    matches.push({ text: matchText, type, index: matchIndex });
                }
            }
        }
    }
    return matches;
};

// Helper: find custom regex matches
export const findCustomRegexMatches = (
    customRegex: DetectionSettings['customRegex'],
    text: string,
    type: DetectedItem['type']
): Array<{ text: string, type: DetectedItem['type'], index: number }> => {
    const matches: Array<{ text: string, type: DetectedItem['type'], index: number }> = [];
    for (const rule of customRegex) {
        try {
            const flags = rule.caseSensitive ? 'g' : 'gi';
            const pattern = new RegExp(rule.pattern, flags);
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                matches.push({ text: match[0], type, index: match.index });
            }
        } catch {
            console.warn(`Skipping invalid regex pattern: ${rule.pattern}`);
        }
    }
    return matches;
};

// Helper: check if a text matches any allowlisted value
export const isAllowlisted = (text: string, allowlist: string[]): boolean => {
    const lowerText = text.toLowerCase();
    return allowlist.some(allowed => allowed.toLowerCase() === lowerText);
};

// Helper: filter matches against allowlist
export const filterAllowlistedMatches = <T extends { text: string }>(
    matches: T[],
    allowlist: string[]
): T[] => {
    return matches.filter(match => !isAllowlisted(match.text, allowlist));
};

// Helper: check for overlap
export const hasValidOverlap = (
    wordStart: number,
    wordEnd: number,
    wordText: string,
    matchStart: number,
    matchEnd: number,
    matchText: string
): boolean => {
    const hasPositionalOverlap = wordStart < matchEnd && wordEnd > matchStart;
    if (!hasPositionalOverlap) return false;

    const wordLower = wordText.toLowerCase();
    const matchLower = matchText.toLowerCase();
    return wordLower.includes(matchLower) || matchLower.includes(wordLower);
};
