export interface SubscriptionCharge {
  orderId: string;
  paymentIntentId: string;
  amount: number;
  status: 'succeeded' | 'failed';
}

export interface SubscriptionChargeResult {
  success: boolean;
  error?: string;
  chargeId?: string;
}

export interface PaymentStatus {
  isCharged: boolean;
  paymentIntentId?: string;
  amount?: number;
  processedAt?: string;
}