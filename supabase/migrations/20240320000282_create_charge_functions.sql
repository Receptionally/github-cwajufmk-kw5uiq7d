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
  for update skip locked;

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
$$ language plpgsql security definer;

-- Create function to get seller charges
create or replace function get_seller_charges(p_seller_id uuid)
returns table (
  payment_intent_id text,
  order_id uuid,
  amount integer,
  status text,
  created_at timestamp with time zone
) as $$
begin
  return query
  select
    pi.stripe_payment_intent_id,
    pi.order_id,
    pi.amount,
    pi.status,
    pi.created_at
  from payment_intents pi
  where pi.seller_id = p_seller_id
  and pi.type = 'subscription_charge'
  order by pi.created_at desc;
end;
$$ language plpgsql security definer;

-- Grant permissions
grant execute on function process_subscription_charge to authenticated;
grant execute on function get_seller_charges to authenticated;