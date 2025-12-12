import { useState, useCallback, useEffect } from 'react';
import type { DetectionSettings } from '../types';

const STORAGE_KEY = 'autoredact_detection_settings';

const DEFAULT_SETTINGS: DetectionSettings = {
    email: true,
    ip: true,
    creditCard: true,
    secret: true,
    pii: true,
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

    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    return {
        settings,
        updateSetting,
        resetSettings,
    };
}
