import { apiRequest, toQueryString } from './client';

export type CheckoutPayload = { packageCode: string; entityType?: 'listing' | 'project' | 'agency' | 'developer' | 'banner'; entityId?: string };
export type PaymentState = { id: string; status: string; packageCode?: string; paidAt?: string };

export function createCheckout(payload: CheckoutPayload) {
  return apiRequest<{ checkoutUrl: string; sessionId: string; transactionId: string }>('/payments/checkout', { method: 'POST', body: JSON.stringify(payload) });
}

export function getPaymentSessionStatus(sessionId: string) {
  return apiRequest<PaymentState | null>(`/payments/session/status${toQueryString({ sessionId })}`);
}
