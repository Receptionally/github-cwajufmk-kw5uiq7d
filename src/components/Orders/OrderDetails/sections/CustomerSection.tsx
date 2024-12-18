import React from 'react';
import type { Order } from '../../../../types/order';

interface CustomerSectionProps {
  order: Order;
}

export function CustomerSection({ order }: CustomerSectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">Customer Information</h4>
      <dl className="space-y-2">
        <div>
          <dt className="text-xs font-medium text-gray-500">Name</dt>
          <dd className="mt-1 text-sm text-gray-900">{order.customer_name}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">Email</dt>
          <dd className="mt-1 text-sm text-gray-900">{order.customer_email}</dd>
        </div>
      </dl>
    </div>
  );
}