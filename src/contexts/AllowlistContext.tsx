import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_ALLOWLIST, ALLOWLIST_STORAGE_KEY } from '../constants/allowlist';
import { AllowlistContext } from './AllowlistContextDef';

export function AllowlistProvider({ children }: { children: ReactNode }) {
    const [allowlist, setAllowlist] = useState<string[]>(() => {
        // Load from localStorage or use defaults
        const saved = localStorage.getItem(ALLOWLIST_STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return [...DEFAULT_ALLOWLIST];
            }
        }
        return [...DEFAULT_ALLOWLIST];
    });

    // Persist to localStorage when allowlist changes
    useEffect(() => {
        localStorage.setItem(ALLOWLIST_STORAGE_KEY, JSON.stringify(allowlist));
    }, [allowlist]);

    const addToAllowlist = (value: string) => {
        const trimmedValue = value.trim();
        if (trimmedValue && !allowlist.some(item => item.trim().toLowerCase() === trimmedValue.toLowerCase())) {
            setAllowlist(prev => [...prev, trimmedValue]);
        }
    };

    const removeFromAllowlist = (value: string) => {
        const normalizedValue = value.trim().toLowerCase();
        setAllowlist(prev => prev.filter(item => item.trim().toLowerCase() !== normalizedValue));
    };

    const resetToDefaults = () => {
        setAllowlist([...DEFAULT_ALLOWLIST]);
    };

    return (
        <AllowlistContext.Provider value={{ allowlist, addToAllowlist, removeFromAllowlist, resetToDefaults }}>
            {children}
        </AllowlistContext.Provider>
    );
}
