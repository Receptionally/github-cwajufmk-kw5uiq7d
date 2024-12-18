import { useState } from 'react';
import { useSubscriptionCharge } from './useSubscriptionCharge';
import type { Order } from '../../../types/order';

export function useOrderExpansion(order: Order) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { loading, error, handleCharge, chargeProcessed } = useSubscriptionCharge(order);

  const handleExpand = async () => {
    // If already processed, just toggle expansion
    if (order.subscription_charge_processed || chargeProcessed) {
      setIsExpanded(!isExpanded);
      return;
    }

    // Otherwise process charge first
    try {
      await handleCharge();
      setIsExpanded(true); // Auto-expand after successful charge
    } catch (err) {
      // Error handling is done in useSubscriptionCharge
      // Just prevent expansion on error
    }
  };

  return {
    isExpanded,
    loading,
    error,
    handleExpand,
    chargeProcessed: order.subscription_charge_processed || chargeProcessed
  };
}