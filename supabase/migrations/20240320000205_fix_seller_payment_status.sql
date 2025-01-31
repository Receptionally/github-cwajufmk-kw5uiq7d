-- Drop existing view if it exists
drop view if exists seller_payment_status cascade;

-- Create view for seller payment status
create or replace view seller_payment_status as
select
  s.id,
  s.business_name,
  s.total_orders,
  s.subscription_status,
  s.setup_intent_status,
  s.setup_intent_id,
  s.subscription_start_date,
  s.subscription_end_date,
  s.debt_amount,
  s.last_failed_charge,
  s.failed_charge_amount,
  case
    when s.debt_amount > 0 then false
    when s.subscription_status = 'active' then true
    when s.total_orders < 3 then true
    else false
  end as can_accept_orders,
  case
    when s.total_orders >= 3 then true
    else false
  end as requires_subscription,
  greatest(0, 3 - s.total_orders) as orders_until_subscription
from sellers s;

-- Grant permissions
grant select on seller_payment_status to authenticated;