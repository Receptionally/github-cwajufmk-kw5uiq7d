import React from 'react';
import { formatCurrency } from '../../../utils/format';
import type { LucideIcon } from 'lucide-react';

interface OrderHeaderProps {
  order: {
    customer_name: string;
    id: string;
    total_amount: number;
    seller_name?: string;
    subscription_charge_processed: boolean;
  };
  onToggle: () => void;
  showSellerInfo?: boolean;
  loading: boolean;
  error: string | null;
  StatusIcon: LucideIcon;
  statusColor: string;
}

export function OrderHeader({
  order,
  onToggle,
  showSellerInfo,
  loading,
  error,
  StatusIcon,
  statusColor
}: OrderHeaderProps) {
  return (
    <div 
      className="px-6 py-4 cursor-pointer hover:bg-gray-50"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <StatusIcon className={`h-5 w-5 ${statusColor}`} />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-medium text-gray-900">
                {order.customer_name}
              </h3>
              <span className="text-sm text-gray-500">
                ({formatCurrency(order.total_amount)})
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Order #{order.id.slice(0, 8)}</span>
              {showSellerInfo && order.seller_name && (
                <>
                  <span>•</span>
                  <span>{order.seller_name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {loading ? (
            <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          ) : !order.subscription_charge_processed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md"
            >
              Pay to View
            </button>
          )}
        </div>
      </div>
    </div>
  );
}