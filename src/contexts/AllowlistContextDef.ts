import { createContext } from 'react';

export interface AllowlistContextType {
    allowlist: string[];
    addToAllowlist: (value: string) => void;
    removeFromAllowlist: (value: string) => void;
    resetToDefaults: () => void;
}

export const AllowlistContext = createContext<AllowlistContextType | undefined>(undefined);
