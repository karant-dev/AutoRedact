// ============================================================================
// ALLOWLIST - Safe values that should NOT be redacted
// ============================================================================

// Default safe IPs and hostnames that are commonly shared
export const DEFAULT_ALLOWLIST = [
    // Localhost / Loopback
    '127.0.0.1',
    'localhost',
    '0.0.0.0',
    '::1',
    
    // Private network ranges (common examples)
    '192.168.0.1',
    '192.168.1.1',
    '10.0.0.1',
    
    // Public DNS servers
    '8.8.8.8',
    '8.8.4.4',
    '1.1.1.1',
    '1.0.0.1',
];

// LocalStorage key for user allowlist
export const ALLOWLIST_STORAGE_KEY = 'autoredact_allowlist';

// Create a normalized Set for O(1) lookups
export const createAllowlistSet = (allowlist: string[]): Set<string> => {
    return new Set(allowlist.map(item => item.toLowerCase().trim()));
};

// Check if a value is in the allowlist (case-insensitive)
// Accepts either an array or a pre-normalized Set for better performance
export const isAllowlisted = (value: string, allowlist: string[] | Set<string>): boolean => {
    const normalizedValue = value.toLowerCase().trim();
    if (allowlist instanceof Set) {
        return allowlist.has(normalizedValue);
    }
    return allowlist.some(item => item.toLowerCase().trim() === normalizedValue);
};
