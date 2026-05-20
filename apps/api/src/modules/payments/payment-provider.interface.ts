export type CheckoutSession = {
  provider: string;
  providerReference: string;
  checkoutUrl: string;
  raw: Record<string, unknown>;
};

export interface PaymentProvider {
  readonly code: string;
  createCheckout(input: {
    transactionId: string;
    amount: string;
    currency: string;
    description: string;
  }): Promise<CheckoutSession>;
}
