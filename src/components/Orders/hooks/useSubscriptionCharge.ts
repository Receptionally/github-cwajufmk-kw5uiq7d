import { useState, useEffect } from 'react';
import { chargeSeller } from '../../../services/stripe/charges';
import { getPaymentIntent } from '../../../services/stripe/payment-intents';
import { logger } from '../../../services/utils/logger';
import type { Order } from '../../../types/order';

export function useSubscriptionCharge(order: Order) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chargeProcessed, setChargeProcessed] = useState(order.subscription_charge_processed);

  // Check initial charge status
  useEffect(() => {
    const checkCharge = async () => {
      try {
        const existingCharge = await getPaymentIntent(order.id);
        if (existingCharge?.status === 'succeeded') {
          setChargeProcessed(true);
        }
      } catch (err) {
        logger.error('Error checking charge status:', err);
      }
    };

    if (!chargeProcessed && !order.subscription_charge_processed) {
      checkCharge();
    }
  }, [order.id, chargeProcessed, order.subscription_charge_processed]);

  const handleCharge = async () => {
    try {
      // Don't attempt if already processed
      if (order.subscription_charge_processed || chargeProcessed) {
        return;
      }

      setLoading(true);
      setError(null);

      // Double check if payment intent exists
      const existingCharge = await getPaymentIntent(order.id);
      if (existingCharge?.status === 'succeeded') {
        setChargeProcessed(true);
        return;
      }

      // Process new charge
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
    chargeProcessed: order.subscription_charge_processed || chargeProcessed
  };
}