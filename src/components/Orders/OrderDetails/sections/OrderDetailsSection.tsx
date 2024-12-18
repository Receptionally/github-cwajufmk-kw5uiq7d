import React from 'react';
import { formatCurrency } from '../../../../utils/format';
import type { Order } from '../../../../types/order';

interface OrderDetailsSectionProps {
  order: Order;
}

export function OrderDetailsSection({ order }: OrderDetailsSectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">Order Details</h4>
      <dl className="space-y-2">
        <div>
          <dt className="text-xs font-medium text-gray-500">Product</dt>
          <dd className="mt-1 text-sm text-gray-900">{order.product_name}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">Quantity</dt>
          <dd className="mt-1 text-sm text-gray-900">{order.quantity}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">Total Amount</dt>
          <dd className="mt-1 text-sm text-gray-900">{formatCurrency(order.total_amount)}</dd>
        </div>
      </dl>
    </div>
  );
}