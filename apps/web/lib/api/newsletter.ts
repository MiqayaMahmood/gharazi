import { apiRequest } from './client';

export type NewsletterSubscribeInput = {
  email: string;
  name?: string;
  city?: string;
  interestsJson?: Record<string, unknown>;
  sourcePage?: string;
};

export function subscribeNewsletter(input: NewsletterSubscribeInput) {
  return apiRequest<{ ok: boolean; message: string; subscriberId?: string; status?: string }>('/newsletter/subscribe', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
