import { useState, useCallback } from 'react';
import { chargeSeller } from '../services/stripe/charges';
import { getPaymentIntent } from '../services/stripe/payment-intents';
import { updateOrderChargeStatus } from '../services/orders/updateOrder';
import { logger } from '../services/utils/logger';
import type { Order } from '../types/order';

interface UseSubscriptionChargeResult {
  loading: boolean;
  error: string | null;
  handleCharge: () => Promise<void>;
  chargeProcessed: boolean;
}

export function useSubscriptionCharge(order: Order): UseSubscriptionChargeResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chargeProcessed, setChargeProcessed] = useState(order.subscription_charge_processed);

  const handleCharge = useCallback(async () => {
    try {
      // Don't attempt if already processed
      if (chargeProcessed) {
        return;
      }

      setLoading(true);
      setError(null);

      // Double check if payment intent exists
      const existingCharge = await getPaymentIntent(order.id);
      if (existingCharge?.status === 'succeeded') {
        await updateOrderChargeStatus(order.id, true);
        setChargeProcessed(true);
        return;
      }

      // Process new charge
      if (order.seller_id) {
        await chargeSeller(order.seller_id, order.id);
        await updateOrderChargeStatus(order.id, true);
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
  }, [order.id, order.seller_id, chargeProcessed]);

  return {
    loading,
    error,
    handleCharge,
    chargeProcessed
  };
}