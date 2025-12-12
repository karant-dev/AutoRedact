/**
 * Date Pattern Generator
 * 
 * Parses a date string and generates regex patterns to match that date
 * in multiple common formats.
 */

interface ParsedDate {
    year: number;
    month: number;
    day: number;
}

// Month names for generating patterns
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_ABBREV = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Parse a date string into year, month, day components
 * Supports formats:
 * - ISO: 2024-01-15, 2024/01/15
 * - US: 01/15/2024, 01-15-2024
 * - EU: 15/01/2024, 15-01-2024, 15.01.2024
 * - Long: January 15, 2024 | 15 January 2024
 */
export function parseDate(dateStr: string): ParsedDate | null {
    const trimmed = dateStr.trim();

    // Try ISO format: YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
        const [, year, month, day] = isoMatch;
        const parsed = { year: parseInt(year, 10), month: parseInt(month, 10), day: parseInt(day, 10) };
        if (isValidDate(parsed)) return parsed;
    }

    // Try US format: MM/DD/YYYY or MM-DD-YYYY
    const usMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (usMatch) {
        const [, month, day, year] = usMatch;
        const parsed = { year: parseInt(year, 10), month: parseInt(month, 10), day: parseInt(day, 10) };
        if (isValidDate(parsed)) return parsed;
    }

    // Try EU format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const euMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (euMatch) {
        const [, day, month, year] = euMatch;
        const parsed = { year: parseInt(year, 10), month: parseInt(month, 10), day: parseInt(day, 10) };
        if (isValidDate(parsed)) return parsed;
    }

    // Try long format: Month DD, YYYY or DD Month YYYY
    const longMatch1 = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (longMatch1) {
        const [, monthName, day, year] = longMatch1;
        const month = parseMonthName(monthName);
        if (month > 0) {
            const parsed = { year: parseInt(year, 10), month, day: parseInt(day, 10) };
            if (isValidDate(parsed)) return parsed;
        }
    }

    const longMatch2 = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (longMatch2) {
        const [, day, monthName, year] = longMatch2;
        const month = parseMonthName(monthName);
        if (month > 0) {
            const parsed = { year: parseInt(year, 10), month, day: parseInt(day, 10) };
            if (isValidDate(parsed)) return parsed;
        }
    }

    return null;
}

function parseMonthName(name: string): number {
    const lower = name.toLowerCase();
    for (let i = 0; i < MONTH_NAMES.length; i++) {
        if (MONTH_NAMES[i].toLowerCase() === lower || MONTH_ABBREV[i].toLowerCase() === lower) {
            return i + 1;
        }
    }
    return 0;
}

function isValidDate(date: ParsedDate): boolean {
    const { year, month, day } = date;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1900 || year > 2100) return false;
    
    // Use native Date for proper validation (handles leap years, days per month)
    const testDate = new Date(year, month - 1, day);
    return testDate.getFullYear() === year && 
           testDate.getMonth() === month - 1 && 
           testDate.getDate() === day;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate regex patterns to match a date in multiple common formats
 */
export function generateDatePatterns(dateStr: string): RegExp[] {
    const parsed = parseDate(dateStr);
    if (!parsed) return [];

    const { year, month, day } = parsed;
    const patterns: string[] = [];

    // Padding helpers
    const mm = month.toString().padStart(2, '0');
    const dd = day.toString().padStart(2, '0');
    const m = month.toString();
    const d = day.toString();
    const yy = year.toString().slice(-2);
    const yyyy = year.toString();

    // Month names
    const monthFull = MONTH_NAMES[month - 1];
    const monthAbbr = MONTH_ABBREV[month - 1];

    // ISO: YYYY-MM-DD, YYYY/MM/DD
    patterns.push(`${yyyy}[-/]${mm}[-/]${dd}`);
    patterns.push(`${yyyy}[-/]${m}[-/]${d}`);

    // US: MM/DD/YYYY, MM-DD-YYYY, M/D/YYYY
    patterns.push(`${mm}[-/]${dd}[-/]${yyyy}`);
    patterns.push(`${m}[-/]${d}[-/]${yyyy}`);
    patterns.push(`${mm}[-/]${dd}[-/]${yy}`);
    patterns.push(`${m}[-/]${d}[-/]${yy}`);

    // EU: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    patterns.push(`${dd}[-/.]${mm}[-/.]${yyyy}`);
    patterns.push(`${d}[-/.]${m}[-/.]${yyyy}`);
    patterns.push(`${dd}[-/.]${mm}[-/.]${yy}`);
    patterns.push(`${d}[-/.]${m}[-/.]${yy}`);

    // Long format: Month DD, YYYY and DD Month YYYY (case-insensitive)
    const monthPatternFull = `(?:${escapeRegex(monthFull)}|${escapeRegex(monthFull.toUpperCase())}|${escapeRegex(monthFull.toLowerCase())})`;
    const monthPatternAbbr = `(?:${escapeRegex(monthAbbr)}\\.?|${escapeRegex(monthAbbr.toUpperCase())}\\.?|${escapeRegex(monthAbbr.toLowerCase())}\\.?)`;
    const monthPattern = `(?:${monthPatternFull}|${monthPatternAbbr})`;
    
    // Month DD, YYYY
    patterns.push(`${monthPattern}\\s+${dd},?\\s+${yyyy}`);
    patterns.push(`${monthPattern}\\s+${d},?\\s+${yyyy}`);
    
    // DD Month YYYY
    patterns.push(`${dd}\\s+${monthPattern}\\s+${yyyy}`);
    patterns.push(`${d}\\s+${monthPattern}\\s+${yyyy}`);

    // Also add ordinal day formats (1st, 2nd, 3rd, etc.)
    const ordinalSuffix = getOrdinalSuffix(day);
    patterns.push(`${monthPattern}\\s+${d}${ordinalSuffix},?\\s+${yyyy}`);
    patterns.push(`${d}${ordinalSuffix}\\s+${monthPattern}\\s+${yyyy}`);

    // Create regex objects with word boundaries
    return patterns.map(p => new RegExp(`\\b${p}\\b`, 'gi'));
}

function getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

/**
 * Validate a regex pattern string
 * Returns null if valid, error message if invalid
 */
export function validateRegex(pattern: string): string | null {
    if (!pattern || pattern.trim() === '') {
        return 'Pattern cannot be empty';
    }
    try {
        new RegExp(pattern);
        return null;
    } catch (e) {
        return `Invalid regex: ${e instanceof Error ? e.message : 'Unknown error'}`;
    }
}
