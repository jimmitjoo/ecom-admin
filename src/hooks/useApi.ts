import { useState } from 'react';
import { api } from '@/api/client';

export function useApi<T>() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const execute = async (apiCall: () => Promise<T>): Promise<T | null> => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await apiCall();
            return result;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { execute, loading, error };
}
