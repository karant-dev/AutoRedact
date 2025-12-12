import { useState, useRef, useEffect } from 'react';
import type { DetectionSettings } from '../types';

type BooleanSettingKey = 'email' | 'ip' | 'creditCard' | 'secret' | 'pii';

interface SettingsDropdownProps {
    settings: DetectionSettings;
    onUpdateSetting: (key: keyof DetectionSettings, value: boolean) => void;
    onAddToAllowlist?: (value: string) => void;
    onRemoveFromAllowlist?: (value: string) => void;
    onResetAllowlist?: () => void;
}

const SETTING_LABELS: Record<BooleanSettingKey, string> = {
    email: 'Emails',
    ip: 'IPv4 / IPv6',
    creditCard: 'Credit Cards',
    secret: 'API Keys',
    pii: 'PII (SSN, etc.)',
};

export function SettingsDropdown({
    settings,
    onUpdateSetting,
    onAddToAllowlist,
    onRemoveFromAllowlist,
    onResetAllowlist,
}: SettingsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [newAllowlistValue, setNewAllowlistValue] = useState('');
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

    const handleAddAllowlistEntry = () => {
        if (newAllowlistValue.trim() && onAddToAllowlist) {
            onAddToAllowlist(newAllowlistValue.trim());
            setNewAllowlistValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddAllowlistEntry();
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                aria-label="Detection Settings"
                aria-expanded={isOpen}
                aria-haspopup="menu"
                id="settings-menu-button"
            >
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium text-slate-300">Settings</span>
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-xl z-50 max-h-[80vh] overflow-y-auto"
                    role="menu"
                    aria-labelledby="settings-menu-button"
                >
                    {/* Detection Types Section */}
                    <div className="p-3 border-b border-slate-700">
                        <h3 className="text-sm font-semibold text-white">Detection Types</h3>
                        <p className="text-xs text-slate-400 mt-1">Choose what to redact</p>
                    </div>
                    <div className="p-2 border-b border-slate-700">
                        {(Object.keys(SETTING_LABELS) as Array<BooleanSettingKey>).map((key) => (
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

                    {/* Safe Values (Allowlist) Section */}
                    <div className="p-3 border-b border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-white">Safe Values</h3>
                                <p className="text-xs text-slate-400 mt-1">Never redact these</p>
                            </div>
                            {onResetAllowlist && (
                                <button
                                    onClick={onResetAllowlist}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                    title="Reset to defaults"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="p-2">
                        {/* Add new entry input */}
                        {onAddToAllowlist && (
                            <div className="flex gap-2 mb-2 p-1">
                                <input
                                    type="text"
                                    value={newAllowlistValue}
                                    onChange={(e) => setNewAllowlistValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Add safe value..."
                                    className="flex-1 px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                />
                                <button
                                    onClick={handleAddAllowlistEntry}
                                    disabled={!newAllowlistValue.trim()}
                                    className="px-2 py-1 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        )}

                        {/* Allowlist entries */}
                        <div className="max-h-32 overflow-y-auto" role="list" aria-label="Safe values list">
                            {settings.allowlist && settings.allowlist.length > 0 ? (
                                settings.allowlist.map((item) => (
                                    <div
                                        key={item}
                                        role="listitem"
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 group"
                                    >
                                        <span className="text-sm text-slate-300 font-mono truncate" title={item}>
                                            {item}
                                        </span>
                                        {onRemoveFromAllowlist && (
                                            <button
                                                onClick={() => onRemoveFromAllowlist(item)}
                                                className="text-slate-500 hover:text-red-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all flex-shrink-0 p-1"
                                                title="Remove"
                                                aria-label={`Remove ${item} from safe values`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500 text-center py-2">No safe values defined</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
