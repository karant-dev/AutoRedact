import { SettingsDropdown } from './SettingsDropdown';
import type { DetectionSettings } from '../types';

interface HeaderProps {
    settings: DetectionSettings;
    onUpdateSetting: (key: keyof DetectionSettings, value: boolean) => void;
}

export function Header({ settings, onUpdateSetting }: HeaderProps) {
    return (
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <span className="text-xl">🛡️</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">AutoRedact</h1>
                        <p className="text-xs text-slate-400">Automatic. Private. Secure.</p>
                    </div>
                </div>
                <SettingsDropdown settings={settings} onUpdateSetting={onUpdateSetting} />
            </div>
        </header>
    );
}
