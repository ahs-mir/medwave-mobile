import { useState, useEffect } from 'react';
import ApiService from '../services/ApiService';

export interface LetterType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export const useLetterTypes = () => {
  const [letterTypes, setLetterTypes] = useState<LetterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLetterTypes = async () => {
      try {
        setLoading(true);
        const templates = await ApiService.getDoctorLetterTypes();
        
        // Filter only enabled letter types
        const enabled = templates
          .filter((t: any) => t.isActive && t.isEnabledForUser !== false)
          .map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            icon: t.icon || 'document-text-outline',
            category: t.category,
          }));
        
        setLetterTypes(enabled);
        setError(null);
      } catch (err) {
        console.error('Error fetching letter types:', err);
        setError('Failed to load letter types');
        // Fallback to empty array
        setLetterTypes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLetterTypes();
  }, []);

  return { letterTypes, loading, error };
};

