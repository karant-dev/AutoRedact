import { useState, useRef, useEffect } from 'react';
import type { DetectionSettings } from '../types';

interface SettingsDropdownProps {
    settings: DetectionSettings;
    onUpdateSetting: (key: keyof DetectionSettings, value: boolean) => void;
}

const SETTING_LABELS: Record<keyof DetectionSettings, string> = {
    email: 'Emails',
    ip: 'IPv4 / IPv6',
    creditCard: 'Credit Cards',
    secret: 'API Keys',
    pii: 'PII (SSN, etc.)',
};

export function SettingsDropdown({ settings, onUpdateSetting }: SettingsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                aria-label="Detection Settings"
                aria-expanded={isOpen}
            >
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium text-slate-300">Settings</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-xl z-50">
                    <div className="p-3 border-b border-slate-700">
                        <h3 className="text-sm font-semibold text-white">Detection Types</h3>
                        <p className="text-xs text-slate-400 mt-1">Choose what to redact</p>
                    </div>
                    <div className="p-2">
                        {(Object.keys(SETTING_LABELS) as Array<keyof DetectionSettings>).map((key) => (
                            <label
                                key={key}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                            >
                                <span className="text-sm text-slate-300">{SETTING_LABELS[key]}</span>
                                <input
                                    type="checkbox"
                                    checked={settings[key]}
                                    onChange={(e) => onUpdateSetting(key, e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                                />
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
