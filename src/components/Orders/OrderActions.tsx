import React from 'react';
import { useUpdateOrder } from '../../hooks/useUpdateOrder';
import type { Order } from '../../types/order';

interface OrderActionsProps {
  order: Order;
}

export function OrderActions({ order }: OrderActionsProps) {
  const { updateStatus, loading, error } = useUpdateOrder();

  return (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
      <div className="flex items-center space-x-4">
        <select
          value={order.status}
          onChange={(e) => updateStatus(order.id, e.target.value as Order['status'])}
          disabled={loading}
          className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}