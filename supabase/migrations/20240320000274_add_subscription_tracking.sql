-- Add subscription tracking column to orders
alter table public.orders
  add column if not exists subscription_charge_processed boolean default false;

-- Create index for subscription tracking
create index if not exists idx_orders_subscription_charge 
  on orders(seller_id, subscription_charge_processed);