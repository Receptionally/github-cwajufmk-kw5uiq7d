export interface Order {
  id: string;
  seller_id: string;
  seller_name?: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  quantity: number;
  total_amount: number;
  status: 'pending' | 'completed';
  stripe_customer_id: string | null;
  stripe_payment_intent: string | null;
  stripe_payment_status: 'pending' | 'succeeded' | 'failed';
  stripe_account_id: string;
  subscription_charge_processed: boolean;
  created_at: string;
  updated_at: string;
}