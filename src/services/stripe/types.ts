export interface SellerCharge {
  payment_intent_id: string;
  order_id: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface ChargeResponse {
  success: boolean;
  paymentIntentId: string;
}