-- Drop existing constraints and triggers
drop trigger if exists enforce_charge_status on orders;
drop function if exists validate_charge_status cascade;
alter table public.orders drop constraint if exists check_subscription_charge;
alter table public.payment_intents drop constraint if exists unique_subscription_charge;

-- Add unique index for payment intents
create unique index if not exists idx_unique_subscription_charge 
  on payment_intents (order_id)
  where type = 'subscription_charge' and status = 'succeeded';

-- Create function to safely process subscription charge
create or replace function process_subscription_charge(
  p_order_id uuid,
  p_payment_intent_id text,
  p_amount integer default 1000
) returns void as $$
declare
  v_order_record record;
  v_lock_obtained boolean;
begin
  -- Try to obtain advisory lock
  select pg_try_advisory_xact_lock(hashtext(p_order_id::text)) into v_lock_obtained;
  
  if not v_lock_obtained then
    raise exception 'Could not obtain lock for order processing';
  end if;

  -- Get order with lock
  select * into v_order_record
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  -- Check if already processed
  if v_order_record.subscription_charge_processed then
    return; -- Silently return if already processed
  end if;

  -- Insert payment intent first
  insert into payment_intents (
    seller_id,
    order_id,
    stripe_payment_intent_id,
    amount,
    status,
    type
  ) values (
    v_order_record.seller_id,
    p_order_id,
    p_payment_intent_id,
    p_amount,
    'succeeded',
    'subscription_charge'
  )
  on conflict do nothing;

  -- Then mark order as processed
  update orders
  set subscription_charge_processed = true
  where id = p_order_id;

end;
$$ language plpgsql security definer;

-- Create function to get payment intent
create or replace function get_payment_intent(
  p_order_id uuid
) returns table (
  id uuid,
  status text,
  amount integer,
  created_at timestamp with time zone
) as $$
begin
  return query
  select 
    pi.id,
    pi.status,
    pi.amount,
    pi.created_at
  from payment_intents pi
  where pi.order_id = p_order_id
  and pi.type = 'subscription_charge'
  and pi.status = 'succeeded'
  limit 1;
end;
$$ language plpgsql security definer;

-- Create indexes for better performance
create index if not exists idx_payment_intents_lookup 
  on payment_intents (order_id, type, status);

create index if not exists idx_orders_charge_status
  on orders (id, subscription_charge_processed);

-- Grant permissions
grant execute on function process_subscription_charge to authenticated;
grant execute on function get_payment_intent to authenticated;

-- Force schema cache refresh
notify pgrst, 'reload schema';