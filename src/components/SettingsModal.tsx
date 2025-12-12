import { useState, useRef, useEffect } from 'react';
import { useAllowlist } from '../hooks/useAllowlist';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { allowlist, addToAllowlist, removeFromAllowlist, resetToDefaults } = useAllowlist();
    const [newValue, setNewValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleAdd = () => {
        if (newValue.trim()) {
            addToAllowlist(newValue);
            setNewValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAdd();
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Settings</h2>
                        <p className="text-sm text-slate-400">Configure safe values to skip redaction</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 overflow-y-auto flex-1">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Safe Values (Allowlist)
                        </label>
                        <p className="text-xs text-slate-500 mb-3">
                            Values in this list will not be redacted. Matching is case-insensitive.
                        </p>
                        
                        {/* Add new value */}
                        <div className="flex gap-2 mb-4">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Add IP, domain, or value..."
                                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                            <button
                                onClick={handleAdd}
                                disabled={!newValue.trim()}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium"
                            >
                                Add
                            </button>
                        </div>

                        {/* Allowlist items */}
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {allowlist.length === 0 ? (
                                <p className="text-slate-500 text-sm italic">No safe values configured</p>
                            ) : (
                                allowlist.map((item) => (
                                    <div
                                        key={item}
                                        className="flex items-center justify-between bg-slate-800 px-3 py-2 rounded-lg group"
                                    >
                                        <span className="text-slate-300 font-mono text-sm">{item}</span>
                                        <button
                                            onClick={() => removeFromAllowlist(item)}
                                            className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-700 flex justify-between">
                    <button
                        onClick={resetToDefaults}
                        className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                        Reset to Defaults
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
