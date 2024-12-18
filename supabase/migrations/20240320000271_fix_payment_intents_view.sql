-- Drop existing view if it exists
drop view if exists payment_intents_view cascade;

-- Add metadata column to payment_intents table
alter table public.payment_intents
  add column if not exists metadata jsonb default '{}'::jsonb;

-- Create index for metadata lookup
create index if not exists idx_payment_intents_metadata 
  on payment_intents using gin (metadata);

-- Create view for payment intents with order details
create view payment_intents_view as
select
  pi.id,
  pi.seller_id,
  pi.stripe_payment_intent_id,
  pi.amount,
  pi.status,
  pi.type,
  pi.created_at,
  pi.metadata,
  o.customer_name,
  o.customer_email,
  o.product_name
from payment_intents pi
left join orders o on o.id = (pi.metadata->>'order_id')::uuid;

-- Grant permissions
grant select on payment_intents_view to authenticated;

-- Force schema cache refresh
notify pgrst, 'reload schema';