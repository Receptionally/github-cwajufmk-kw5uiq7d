import { useState } from 'react';
import { chargeSeller } from '../../../services/stripe/chargeSeller';
import { logger } from '../../../services/utils/logger';
import type { Order } from '../../../types/order';

export function useChargeSubscription(order: Order) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chargeProcessed, setChargeProcessed] = useState(order.subscription_charge_processed);

  const handleCharge = async () => {
    try {
      // Don't attempt if already processed
      if (chargeProcessed) {
        return;
      }

      setLoading(true);
      setError(null);

      if (order.seller_id) {
        await chargeSeller(order.seller_id, order.id);
        setChargeProcessed(true);
        logger.info('Successfully processed subscription charge');
      }
    } catch (err) {
      logger.error('Error handling subscription charge:', err);
      setError(err instanceof Error ? err.message : 'Failed to process subscription charge');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    handleCharge,
    chargeProcessed
  };
}