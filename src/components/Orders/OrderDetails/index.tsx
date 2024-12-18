import React from 'react';
import { formatCurrency, formatDate } from '../../../utils/format';
import { CustomerSection } from './sections/CustomerSection';
import { OrderDetailsSection } from './sections/OrderDetailsSection';
import { DeliverySection } from './sections/DeliverySection';
import { StackingSection } from './sections/StackingSection';
import { PaymentSection } from './sections/PaymentSection';
import { TimestampSection } from './sections/TimestampSection';
import type { Order } from '../../../types/order';

interface OrderDetailsProps {
  order: Order;
  showSellerInfo?: boolean;
}

export function OrderDetails({ order, showSellerInfo = false }: OrderDetailsProps) {
  return (
    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CustomerSection order={order} />
        <OrderDetailsSection order={order} />
        <DeliverySection order={order} />
        {order.stacking_included && <StackingSection order={order} />}
        <PaymentSection order={order} />
        <TimestampSection order={order} />
      </div>
    </div>
  );
}