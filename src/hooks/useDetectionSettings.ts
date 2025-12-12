import { useState, useCallback, useEffect } from 'react';
import type { DetectionSettings } from '../types';
import { DEFAULT_ALLOWLIST } from '../constants/config';

const STORAGE_KEY = 'autoredact_detection_settings';

const DEFAULT_SETTINGS: DetectionSettings = {
    email: true,
    ip: true,
    creditCard: true,
    secret: true,
    pii: true,
    allowlist: DEFAULT_ALLOWLIST,
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

    return {
        settings,
        updateSetting,
        addToAllowlist,
        removeFromAllowlist,
        resetAllowlist,
        resetSettings,
    };
}
