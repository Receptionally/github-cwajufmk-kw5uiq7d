import React, { useState } from 'react';
import { Clock, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { OrderDetails } from './OrderDetails';
import { OrderActions } from './OrderActions';
import { useSubscriptionCharge } from '../../hooks/useSubscriptionCharge';
import { formatCurrency } from '../../utils/format';
import type { Order } from '../../types/order';

interface OrderRowProps {
  order: Order;
  showSellerInfo?: boolean;
}

const STATUS_ICONS = {
  pending: Clock,
  completed: CheckCircle,
} as const;

const STATUS_COLORS = {
  pending: 'text-yellow-500',
  completed: 'text-green-500',
} as const;

export function OrderRow({ order, showSellerInfo = false }: OrderRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { loading, error, handleCharge, chargeProcessed } = useSubscriptionCharge({ order });
  const StatusIcon = STATUS_ICONS[order.status];

  const handleClick = async () => {
    if (!chargeProcessed) {
      try {
        await handleCharge();
        setIsExpanded(true); // Auto-expand after successful charge
      } catch (err) {
        // Error is handled in useSubscriptionCharge
        return;
      }
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <StatusIcon className={`h-5 w-5 ${STATUS_COLORS[order.status]}`} />
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
            <button
              onClick={handleClick}
              disabled={loading}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center space-x-1 ${
                chargeProcessed
                  ? 'text-gray-600 hover:text-gray-800'
                  : 'text-white bg-orange-600 hover:bg-orange-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : chargeProcessed ? (
                <>
                  <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </>
              ) : (
                'Pay to View'
              )}
            </button>
          </div>
        </div>
      </div>

      {chargeProcessed && isExpanded && (
        <>
          <OrderDetails order={order} showSellerInfo={showSellerInfo} />
          <OrderActions order={order} />
        </>
      )}
    </div>
  );
}