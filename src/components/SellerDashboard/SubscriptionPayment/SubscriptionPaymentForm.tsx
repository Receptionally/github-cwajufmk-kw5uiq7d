import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { logger } from '../../../services/utils/logger';

interface SubscriptionPaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function SubscriptionPaymentForm({ clientSecret, onSuccess, onClose }: SubscriptionPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) throw submitError;

      const { setupIntent, error: setupError } = await stripe.confirmSetup({
        elements,
        clientSecret,
        redirect: 'if_required'
      });

      if (setupError) throw setupError;
      
      logger.info('Successfully set up subscription payment');
      onSuccess();
    } catch (err) {
      logger.error('Error setting up payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to set up payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-t border-gray-200 pt-6">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Card Details
        </label>
        <PaymentElement />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
        >
          {loading ? 'Setting up...' : 'Set Up Payment'}
        </button>
      </div>
    </form>
  );
}