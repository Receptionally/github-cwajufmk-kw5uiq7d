-- Drop existing constraints first
alter table public.payment_intents
  drop constraint if exists unique_subscription_charge;

-- Add unique constraint with proper syntax
create unique index unique_subscription_charge_idx 
  on payment_intents (order_id, type)
  where type = 'subscription_charge' and status = 'succeeded';

-- Add check constraint to prevent invalid states
alter table public.orders
  drop constraint if exists check_subscription_charge;

alter table public.orders
  add constraint check_subscription_charge 
    check (
      subscription_charge_processed = false or
      (subscription_charge_processed = true and 
        exists (
          select 1 
          from payment_intents 
          where payment_intents.order_id = orders.id 
          and payment_intents.type = 'subscription_charge'
          and payment_intents.status = 'succeeded'
        ))
    );

-- Create function to validate charge status
create or replace function validate_charge_status()
returns trigger as $$
begin
  if new.subscription_charge_processed = true and not exists (
    select 1 
    from payment_intents 
    where payment_intents.order_id = new.id 
    and payment_intents.type = 'subscription_charge'
    and payment_intents.status = 'succeeded'
  ) then
    raise exception 'Cannot mark order as processed without successful payment intent';
  end if;
  return new;
end;
$$ language plpgsql;

-- Drop existing trigger if it exists
drop trigger if exists enforce_charge_status on orders;

-- Create trigger to enforce validation
create trigger enforce_charge_status
  before update of subscription_charge_processed on orders
  for each row
  when (old.subscription_charge_processed = false and new.subscription_charge_processed = true)
  execute function validate_charge_status();

-- Create indexes for better performance
create index idx_payment_intents_lookup 
  on payment_intents (order_id, type, status);

create index idx_orders_charge_status
  on orders (id, subscription_charge_processed);

-- Force schema cache refresh
notify pgrst, 'reload schema';