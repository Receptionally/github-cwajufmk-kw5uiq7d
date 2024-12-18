-- Drop existing constraint if it exists
alter table public.payment_intents
  drop constraint if exists unique_subscription_charge;

-- Add unique constraint for subscription charges
alter table public.payment_intents
  add constraint unique_subscription_charge unique (order_id, type) 
  where type = 'subscription_charge';

-- Add subscription_charge_processed column to orders if it doesn't exist
alter table public.orders
  add column if not exists subscription_charge_processed boolean default false;

-- Create function to safely process subscription charge
create or replace function process_subscription_charge(
  p_order_id uuid,
  p_payment_intent_id text,
  p_amount integer
) returns void as $$
declare
  v_order_record record;
begin
  -- Get order with lock to prevent concurrent processing
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
  );

  -- Mark order as processed
  update orders
  set subscription_charge_processed = true
  where id = p_order_id;

end;
$$ language plpgsql;

-- Grant permissions
grant execute on function process_subscription_charge to authenticated;

-- Force schema cache refresh
notify pgrst, 'reload schema';