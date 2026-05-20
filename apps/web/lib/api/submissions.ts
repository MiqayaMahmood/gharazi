import { apiRequest } from './client';

export type SubmissionInput = {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message: string;
  category?: string;
  sourcePage?: string;
  channel?: 'web' | 'widget' | 'contact_page' | 'homepage';
  priority?: 'low' | 'normal' | 'high';
  website?: string;
};

export function submitFeedback(input: SubmissionInput) {
  return apiRequest<{ ok: boolean; id: string; status: string }>('/feedback', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function submitContact(input: SubmissionInput) {
  return apiRequest<{ ok: boolean; id: string; status: string }>('/contact', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function submitSupportRequest(input: SubmissionInput) {
  return apiRequest<{ ok: boolean; id: string; status: string }>('/support-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
