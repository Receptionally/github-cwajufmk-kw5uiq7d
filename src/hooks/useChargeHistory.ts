import { useState, useEffect } from 'react';
import { getSellerCharges } from '../services/stripe/getCharges';
import { logger } from '../services/utils/logger';

interface Charge {
  payment_intent_id: string;
  order_id: string;
  amount: number;
  status: string;
  created_at: string;
}

export function useChargeHistory(sellerId: string) {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCharges() {
      try {
        setLoading(true);
        setError(null);

        const data = await getSellerCharges(sellerId);
        setCharges(data);
        
        logger.info('Fetched charges:', { count: data.length });
      } catch (err) {
        logger.error('Error fetching charges:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch charges');
      } finally {
        setLoading(false);
      }
    }

    if (sellerId) {
      fetchCharges();
    }
  }, [sellerId]);

  return { charges, loading, error };
}