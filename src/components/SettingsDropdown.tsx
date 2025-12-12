import { useState, useRef, useEffect } from 'react';
import type { DetectionSettings, CustomRegexRule } from '../types';

type BooleanSettingKey = 'email' | 'ip' | 'creditCard' | 'secret' | 'pii';

interface SettingsDropdownProps {
    settings: DetectionSettings;
    onUpdateSetting: (key: keyof DetectionSettings, value: boolean) => void;
    onAddToAllowlist?: (value: string) => void;
    onRemoveFromAllowlist?: (value: string) => void;
    onResetAllowlist?: () => void;
    // Block Words
    onAddBlockWord?: (word: string) => void;
    onRemoveBlockWord?: (word: string) => void;
    onResetBlockWords?: () => void;
    // Custom Dates
    onAddCustomDate?: (dateStr: string) => string | null;
    onRemoveCustomDate?: (dateStr: string) => void;
    onResetCustomDates?: () => void;
    // Custom Regex
    onAddCustomRegex?: (pattern: string, caseSensitive: boolean, label?: string) => string | null;
    onRemoveCustomRegex?: (id: string) => void;
    onResetCustomRegex?: () => void;
}

const SETTING_LABELS: Record<BooleanSettingKey, string> = {
    email: 'Emails',
    ip: 'IPv4 / IPv6',
    creditCard: 'Credit Cards',
    secret: 'API Keys',
    pii: 'PII (SSN, etc.)',
};

// Reusable Remove Button Component
function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button
            onClick={onClick}
            className="text-slate-500 hover:text-red-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all flex-shrink-0 p-1"
            title="Remove"
            aria-label={label}
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    );
}

// Section Header Component
function SectionHeader({ title, subtitle, onReset }: { title: string; subtitle: string; onReset?: () => void }) {
    return (
        <div className="p-3 border-b border-slate-700">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
                </div>
                {onReset && (
                    <button
                        onClick={onReset}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                        title="Reset"
                    >
                        Reset
                    </button>
                )}
            </div>
        </div>
    );
}

// String List Items Component
function StringListItems({ 
    items, 
    onRemove, 
    emptyMessage 
}: { 
    items: string[]; 
    onRemove: (id: string) => void; 
    emptyMessage: string;
}) {
    return (
        <div className="max-h-32 overflow-y-auto" role="list">
            {items.length > 0 ? (
                items.map((item) => (
                    <div
                        key={item}
                        role="listitem"
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 group"
                    >
                        <span className="text-sm text-slate-300 font-mono truncate" title={item}>
                            {item}
                        </span>
                        <RemoveButton onClick={() => onRemove(item)} label={`Remove ${item}`} />
                    </div>
                ))
            ) : (
                <p className="text-xs text-slate-500 text-center py-2">{emptyMessage}</p>
            )}
        </div>
    );
}

// Regex List Items Component
function RegexListItems({ 
    items, 
    onRemove, 
    emptyMessage 
}: { 
    items: CustomRegexRule[]; 
    onRemove: (id: string) => void; 
    emptyMessage: string;
}) {
    return (
        <div className="max-h-32 overflow-y-auto" role="list">
            {items.length > 0 ? (
                items.map((rule) => (
                    <div
                        key={rule.id}
                        role="listitem"
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 group"
                    >
                        <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-300 font-mono truncate block" title={rule.pattern}>
                                {rule.label || rule.pattern}
                            </span>
                            {rule.label && (
                                <span className="text-xs text-slate-500 font-mono truncate block" title={rule.pattern}>
                                    {rule.pattern}
                                </span>
                            )}
                            {rule.caseSensitive && (
                                <span className="text-xs text-cyan-400">Case sensitive</span>
                            )}
                        </div>
                        <RemoveButton onClick={() => onRemove(rule.id)} label={`Remove ${rule.label || rule.pattern}`} />
                    </div>
                ))
            ) : (
                <p className="text-xs text-slate-500 text-center py-2">{emptyMessage}</p>
            )}
        </div>
    );
}

export function SettingsDropdown({
    settings,
    onUpdateSetting,
    onAddToAllowlist,
    onRemoveFromAllowlist,
    onResetAllowlist,
    onAddBlockWord,
    onRemoveBlockWord,
    onResetBlockWords,
    onAddCustomDate,
    onRemoveCustomDate,
    onResetCustomDates,
    onAddCustomRegex,
    onRemoveCustomRegex,
    onResetCustomRegex,
}: SettingsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [newAllowlistValue, setNewAllowlistValue] = useState('');
    const [newBlockWord, setNewBlockWord] = useState('');
    const [newCustomDate, setNewCustomDate] = useState('');
    const [customDateError, setCustomDateError] = useState<string | null>(null);
    const [newRegexPattern, setNewRegexPattern] = useState('');
    const [newRegexCaseSensitive, setNewRegexCaseSensitive] = useState(false);
    const [newRegexLabel, setNewRegexLabel] = useState('');
    const [regexError, setRegexError] = useState<string | null>(null);
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

    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            action();
        }
    };

    const handleAddAllowlistEntry = () => {
        if (newAllowlistValue.trim() && onAddToAllowlist) {
            onAddToAllowlist(newAllowlistValue.trim());
            setNewAllowlistValue('');
        }
    };

    const handleAddBlockWord = () => {
        if (newBlockWord.trim() && onAddBlockWord) {
            onAddBlockWord(newBlockWord.trim());
            setNewBlockWord('');
        }
    };

    const handleAddCustomDate = () => {
        if (newCustomDate.trim() && onAddCustomDate) {
            const error = onAddCustomDate(newCustomDate.trim());
            if (error) {
                setCustomDateError(error);
            } else {
                setNewCustomDate('');
                setCustomDateError(null);
            }
        }
    };

    const handleAddCustomRegex = () => {
        if (newRegexPattern.trim() && onAddCustomRegex) {
            const error = onAddCustomRegex(newRegexPattern.trim(), newRegexCaseSensitive, newRegexLabel.trim() || undefined);
            if (error) {
                setRegexError(error);
            } else {
                setNewRegexPattern('');
                setNewRegexLabel('');
                setNewRegexCaseSensitive(false);
                setRegexError(null);
            }
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
                    className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-700 shadow-xl z-50 max-h-[80vh] overflow-y-auto"
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
                    <SectionHeader title="Safe Values" subtitle="Never redact these" onReset={onResetAllowlist} />
                    <div className="p-2 border-b border-slate-700">
                        {onAddToAllowlist && (
                            <div className="mb-2 p-1">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newAllowlistValue}
                                        onChange={(e) => setNewAllowlistValue(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, handleAddAllowlistEntry)}
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
                            </div>
                        )}
                        <StringListItems
                            items={settings.allowlist || []}
                            onRemove={(item) => onRemoveFromAllowlist?.(item)}
                            emptyMessage="No safe values defined"
                        />
                    </div>

                    {/* Advanced Section Header */}
                    <div className="p-3 border-b border-slate-700 bg-slate-800/50">
                        <h3 className="text-sm font-semibold text-cyan-400">Advanced</h3>
                        <p className="text-xs text-slate-400 mt-1">Custom redaction rules</p>
                    </div>

                    {/* Block Words Section */}
                    <SectionHeader title="Block Words" subtitle="Always redact these words" onReset={onResetBlockWords} />
                    <div className="p-2 border-b border-slate-700">
                        {onAddBlockWord && (
                            <div className="mb-2 p-1">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newBlockWord}
                                        onChange={(e) => setNewBlockWord(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, handleAddBlockWord)}
                                        placeholder="e.g., Project Titan, John Doe"
                                        className="flex-1 px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    />
                                    <button
                                        onClick={handleAddBlockWord}
                                        disabled={!newBlockWord.trim()}
                                        className="px-2 py-1 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}
                        <StringListItems
                            items={settings.blockWords || []}
                            onRemove={(word) => onRemoveBlockWord?.(word)}
                            emptyMessage="No block words defined"
                        />
                    </div>

                    {/* Custom Dates Section */}
                    <SectionHeader title="Redact Dates" subtitle="Redact dates in any format" onReset={onResetCustomDates} />
                    <div className="p-2 border-b border-slate-700">
                        {onAddCustomDate && (
                            <div className="mb-2 p-1">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCustomDate}
                                        onChange={(e) => { setNewCustomDate(e.target.value); setCustomDateError(null); }}
                                        onKeyDown={(e) => handleKeyDown(e, handleAddCustomDate)}
                                        placeholder="e.g., 1990-05-15, 05/15/1990"
                                        className="flex-1 px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    />
                                    <button
                                        onClick={handleAddCustomDate}
                                        disabled={!newCustomDate.trim()}
                                        className="px-2 py-1 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                                {customDateError && <p className="text-xs text-red-400 mt-1 px-1">{customDateError}</p>}
                            </div>
                        )}
                        <StringListItems
                            items={settings.customDates || []}
                            onRemove={(date) => onRemoveCustomDate?.(date)}
                            emptyMessage="No dates to redact"
                        />
                    </div>

                    {/* Custom Regex Section */}
                    <SectionHeader title="Custom Patterns" subtitle="Regex patterns to match" onReset={onResetCustomRegex} />
                    <div className="p-2">
                        {onAddCustomRegex && (
                            <div className="mb-2 p-1">
                                <input
                                    type="text"
                                    value={newRegexPattern}
                                    onChange={(e) => { setNewRegexPattern(e.target.value); setRegexError(null); }}
                                    onKeyDown={(e) => handleKeyDown(e, handleAddCustomRegex)}
                                    placeholder="Regex pattern, e.g., INV-\d{4}"
                                    className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                                />
                                <input
                                    type="text"
                                    value={newRegexLabel}
                                    onChange={(e) => setNewRegexLabel(e.target.value)}
                                    placeholder="Label (optional)"
                                    className="w-full mt-2 px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                />
                                <div className="flex items-center justify-between mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newRegexCaseSensitive}
                                            onChange={(e) => setNewRegexCaseSensitive(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                                        />
                                        <span className="text-xs text-slate-400">Case sensitive</span>
                                    </label>
                                    <button
                                        onClick={handleAddCustomRegex}
                                        disabled={!newRegexPattern.trim()}
                                        className="px-2 py-1 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                                {regexError && <p className="text-xs text-red-400 mt-1">{regexError}</p>}
                            </div>
                        )}
                        <RegexListItems
                            items={settings.customRegex || []}
                            onRemove={(id) => onRemoveCustomRegex?.(id)}
                            emptyMessage="No custom patterns defined"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
