import { Injectable } from '@nestjs/common';
import { CheckoutSession, PaymentProvider } from './payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly code = 'mock';

  async createCheckout(input: {
    transactionId: string;
    amount: string;
    currency: string;
    description: string;
  }): Promise<CheckoutSession> {
    return {
      provider: this.code,
      providerReference: `mock_${input.transactionId}`,
      checkoutUrl: `/mock-payments/${input.transactionId}`,
      raw: { ...input, mode: 'mock' },
    };
  }
}
