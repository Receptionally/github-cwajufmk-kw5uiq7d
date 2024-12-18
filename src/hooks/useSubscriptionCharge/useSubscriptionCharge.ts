import { useState, useCallback, useEffect } from 'react';
import { chargeSeller } from '../../services/stripe/charges';
import { getPaymentStatus } from '../../services/stripe/subscription';
import { updateOrderChargeStatus } from '../../services/orders/updateOrder';
import { logger } from '../../services/utils/logger';
import type { UseSubscriptionChargeProps, UseSubscriptionChargeResult } from './types';

export function useSubscriptionCharge({ order }: UseSubscriptionChargeProps): UseSubscriptionChargeResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chargeProcessed, setChargeProcessed] = useState(order.subscription_charge_processed);

  // Check initial charge status
  useEffect(() => {
    const checkCharge = async () => {
      try {
        const status = await getPaymentStatus(order.id);
        if (status.isCharged) {
          setChargeProcessed(true);
          await updateOrderChargeStatus(order.id, true);
        }
      } catch (err) {
        logger.error('Error checking charge status:', err);
      }
    };

    if (!chargeProcessed) {
      checkCharge();
    }
  }, [order.id, chargeProcessed]);

  const handleCharge = useCallback(async () => {
    if (chargeProcessed) return;

    setLoading(true);
    setError(null);

    try {
      // Double check payment status
      const status = await getPaymentStatus(order.id);
      if (status.isCharged) {
        setChargeProcessed(true);
        await updateOrderChargeStatus(order.id, true);
        return;
      }

      // Process new charge
      if (order.seller_id) {
        await chargeSeller(order.seller_id, order.id);
        setChargeProcessed(true);
        await updateOrderChargeStatus(order.id, true);
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