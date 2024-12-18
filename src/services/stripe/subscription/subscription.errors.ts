export class SubscriptionChargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubscriptionChargeError';
  }
}

export const SUBSCRIPTION_ERRORS = {
  ALREADY_CHARGED: 'Order has already been charged',
  INVALID_ORDER: 'Invalid order ID',
  CHARGE_FAILED: 'Failed to process subscription charge',
  LOCK_ERROR: 'Could not obtain lock for processing',
} as const;