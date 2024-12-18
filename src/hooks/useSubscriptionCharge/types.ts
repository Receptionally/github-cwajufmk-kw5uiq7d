import type { Order } from '../../types/order';

export interface UseSubscriptionChargeProps {
  order: Order;
}

export interface UseSubscriptionChargeResult {
  loading: boolean;
  error: string | null;
  handleCharge: () => Promise<void>;
  chargeProcessed: boolean;
}