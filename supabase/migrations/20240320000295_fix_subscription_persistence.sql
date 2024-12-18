-- Drop existing view if it exists
drop view if exists order_charges cascade;

-- Create view for order charges with better indexing
create view order_charges as
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

-- Create function to process charge with better state handling
create or replace function process_subscription_charge(
  p_order_id uuid,
  p_payment_intent_id text,
  p_amount integer default 1000
) returns boolean as $$
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
    return true; -- Return true if already processed
  end if;

  -- Mark order as processed first
  update orders
  set subscription_charge_processed = true
  where id = p_order_id;

  -- Insert payment intent
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
  on conflict (order_id, type) do nothing;

  return true;
exception 
  when others then
    -- Log error and return false
    raise notice 'Error processing charge: %', sqlerrm;
    return false;
end;
$$ language plpgsql security definer;

-- Create function to check if order is charged
create or replace function is_order_charged(p_order_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 
    from orders 
    where id = p_order_id 
    and subscription_charge_processed = true
  );
end;
$$ language plpgsql security definer;

-- Grant permissions
grant select on order_charges to authenticated;
grant execute on function process_subscription_charge to authenticated;
grant execute on function is_order_charged to authenticated;

-- Create better indexes
create index if not exists idx_orders_subscription_status
    on orders(id, subscription_charge_processed);
create index if not exists idx_payment_intents_lookup
    on payment_intents(order_id, type, status);

-- Force schema cache refresh
notify pgrst, 'reload schema';