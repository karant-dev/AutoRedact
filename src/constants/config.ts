// PDF processing limits
export const PDF_MAX_SIZE_MB = 10;
export const PDF_MAX_PAGES = 20;

// Default allowlist: Safe IPs/domains that should not be redacted
export const DEFAULT_ALLOWLIST = [
    // Localhost and loopback
    'localhost',
    '127.0.0.1',
    '::1',
    // Common local gateway/router IPs
    '192.168.0.1',
    '192.168.1.1',
    '10.0.0.1',
    // Public DNS servers
    '8.8.8.8',
    '8.8.4.4',
    '1.1.1.1',
    '1.0.0.1',
];
