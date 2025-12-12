import { useState, useCallback, useEffect } from 'react';
import type { DetectionSettings, CustomRegexRule } from '../types';
import { DEFAULT_ALLOWLIST } from '../constants/config';
import { validateRegex, parseDate } from '../utils/datePatterns';

const STORAGE_KEY = 'autoredact_detection_settings';

const DEFAULT_SETTINGS: DetectionSettings = {
    email: true,
    ip: true,
    creditCard: true,
    secret: true,
    pii: true,
    allowlist: DEFAULT_ALLOWLIST,
    blockWords: [],
    customDates: [],
    customRegex: [],
};

export function useDetectionSettings() {
    const [settings, setSettings] = useState<DetectionSettings>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            }
        } catch {
            // Ignore errors, use defaults
        }
        return DEFAULT_SETTINGS;
    });

    // Persist to localStorage whenever settings change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            // Ignore storage errors
        }
    }, [settings]);

    const updateSetting = useCallback((key: keyof DetectionSettings, value: boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    const addToAllowlist = useCallback((value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        setSettings(prev => {
            // Case-insensitive duplicate check
            const lowerValue = trimmed.toLowerCase();
            const exists = prev.allowlist.some(item => item.toLowerCase() === lowerValue);
            if (exists) return prev;
            return { ...prev, allowlist: [...prev.allowlist, trimmed] };
        });
    }, []);

    const removeFromAllowlist = useCallback((value: string) => {
        setSettings(prev => ({
            ...prev,
            allowlist: prev.allowlist.filter(item => item.toLowerCase() !== value.toLowerCase()),
        }));
    }, []);

    const resetAllowlist = useCallback(() => {
        setSettings(prev => ({ ...prev, allowlist: DEFAULT_ALLOWLIST }));
    }, []);

    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    // Block Words Management
    const addBlockWord = useCallback((word: string) => {
        const trimmed = word.trim();
        if (!trimmed) return;
        setSettings(prev => {
            const lowerValue = trimmed.toLowerCase();
            const exists = prev.blockWords.some(item => item.toLowerCase() === lowerValue);
            if (exists) return prev;
            return { ...prev, blockWords: [...prev.blockWords, trimmed] };
        });
    }, []);

    const removeBlockWord = useCallback((word: string) => {
        setSettings(prev => ({
            ...prev,
            blockWords: prev.blockWords.filter(item => item.toLowerCase() !== word.toLowerCase()),
        }));
    }, []);

    const resetBlockWords = useCallback(() => {
        setSettings(prev => ({ ...prev, blockWords: [] }));
    }, []);

    // Custom Dates Management
    const addCustomDate = useCallback((dateStr: string): string | null => {
        const trimmed = dateStr.trim();
        if (!trimmed) return 'Date cannot be empty';
        
        // Validate the date can be parsed
        const parsed = parseDate(trimmed);
        if (!parsed) {
            return 'Invalid date format. Try: YYYY-MM-DD, MM/DD/YYYY, January 15, 2024';
        }
        
        setSettings(prev => {
            const exists = prev.customDates.some(item => item === trimmed);
            if (exists) return prev;
            return { ...prev, customDates: [...prev.customDates, trimmed] };
        });
        return null;
    }, []);

    const removeCustomDate = useCallback((dateStr: string) => {
        setSettings(prev => ({
            ...prev,
            customDates: prev.customDates.filter(item => item !== dateStr),
        }));
    }, []);

    const resetCustomDates = useCallback(() => {
        setSettings(prev => ({ ...prev, customDates: [] }));
    }, []);

    // Custom Regex Management
    const addCustomRegex = useCallback((pattern: string, caseSensitive: boolean = false, label?: string): string | null => {
        const trimmed = pattern.trim();
        const error = validateRegex(trimmed);
        if (error) return error;

        const newRule: CustomRegexRule = {
            id: `regex-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            pattern: trimmed,
            caseSensitive,
            label: label?.trim() || undefined,
        };

        setSettings(prev => {
            // Check for duplicate patterns
            const exists = prev.customRegex.some(r => r.pattern === trimmed);
            if (exists) return prev;
            return { ...prev, customRegex: [...prev.customRegex, newRule] };
        });
        return null;
    }, []);

    const removeCustomRegex = useCallback((id: string) => {
        setSettings(prev => ({
            ...prev,
            customRegex: prev.customRegex.filter(rule => rule.id !== id),
        }));
    }, []);

    const resetCustomRegex = useCallback(() => {
        setSettings(prev => ({ ...prev, customRegex: [] }));
    }, []);

    return {
        settings,
        updateSetting,
        addToAllowlist,
        removeFromAllowlist,
        resetAllowlist,
        resetSettings,
        // Block Words
        addBlockWord,
        removeBlockWord,
        resetBlockWords,
        // Custom Dates
        addCustomDate,
        removeCustomDate,
        resetCustomDates,
        // Custom Regex
        addCustomRegex,
        removeCustomRegex,
        resetCustomRegex,
    };
}
