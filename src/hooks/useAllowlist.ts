import { useContext } from 'react';
import { AllowlistContext } from '../contexts/AllowlistContextDef';

export function useAllowlist() {
    const context = useContext(AllowlistContext);
    if (context === undefined) {
        throw new Error('useAllowlist must be used within an AllowlistProvider');
    }
    return context;
}
