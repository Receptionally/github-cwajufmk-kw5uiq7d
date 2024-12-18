-- Add subscription charge tracking to orders table
alter table public.orders
  add column if not exists subscription_charge_processed boolean default false;

-- Create payment_intents table if it doesn't exist
create table if not exists public.payment_intents (
    id uuid primary key default uuid_generate_v4(),
    seller_id uuid references public.sellers(id) on delete cascade,
    order_id uuid references public.orders(id) on delete cascade,
    stripe_payment_intent_id text not null,
    amount integer not null,
    status text not null check (status in ('succeeded', 'failed')),
    type text not null check (type in ('subscription_charge')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Add constraint to prevent duplicate charges
    constraint unique_subscription_charge unique (order_id, type)
);

-- Create indexes for better performance
create index if not exists idx_orders_subscription_charge 
    on orders(seller_id, subscription_charge_processed);
create index if not exists idx_payment_intents_order_type 
    on payment_intents(order_id, type);

-- Create function to mark order as charged
create or replace function mark_order_charged(
  p_order_id uuid,
  p_payment_intent_id text
) returns void as $$
begin
  -- Update order
  update orders
  set subscription_charge_processed = true
  where id = p_order_id;

  -- Record payment intent
  insert into payment_intents (
    order_id,
    seller_id,
    stripe_payment_intent_id,
    amount,
    status,
    type
  )
  select 
    o.id,
    o.seller_id,
    p_payment_intent_id,
    1000, -- $10.00 in cents
    'succeeded',
    'subscription_charge'
  from orders o
  where o.id = p_order_id;
end;
$$ language plpgsql security definer;

-- Create view for order charges
create or replace view order_charges as
select
  o.id as order_id,
  o.seller_id,
  o.subscription_charge_processed,
  pi.stripe_payment_intent_id,
  pi.amount,
  pi.status,
  pi.created_at as charge_date
from orders o
left join payment_intents pi 
  on o.id = pi.order_id 
  and pi.type = 'subscription_charge';

-- Grant permissions
grant usage on schema public to anon, authenticated;
grant all privileges on public.payment_intents to anon, authenticated;
grant select on order_charges to authenticated;
grant execute on function mark_order_charged to authenticated;

-- Force schema cache refresh
notify pgrst, 'reload schema';