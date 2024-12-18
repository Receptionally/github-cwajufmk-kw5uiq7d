-- Add better constraints and indexes
alter table public.payment_intents
  drop constraint if exists unique_subscription_charge,
  add constraint unique_subscription_charge 
    unique nulls not distinct (order_id, type, status)
    where type = 'subscription_charge' and status = 'succeeded';

-- Add check constraint to prevent invalid states
alter table public.orders
  add constraint check_subscription_charge 
    check (
      (subscription_charge_processed = false) or
      (subscription_charge_processed = true and exists (
        select 1 
        from payment_intents 
        where order_id = orders.id 
        and type = 'subscription_charge'
        and status = 'succeeded'
      ))
    );

-- Create function to validate charge status
create or replace function validate_charge_status()
returns trigger as $$
begin
  if new.subscription_charge_processed = true and not exists (
    select 1 
    from payment_intents 
    where order_id = new.id 
    and type = 'subscription_charge'
    and status = 'succeeded'
  ) then
    raise exception 'Cannot mark order as processed without successful payment intent';
  end if;
  return new;
end;
$$ language plpgsql;

-- Create trigger to enforce validation
create trigger enforce_charge_status
  before update of subscription_charge_processed on orders
  for each row
  when (old.subscription_charge_processed = false and new.subscription_charge_processed = true)
  execute function validate_charge_status();

-- Force schema cache refresh
notify pgrst, 'reload schema';