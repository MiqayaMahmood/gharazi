import { apiRequest } from './client';
import type { CurrentUser } from './auth';

export type ProfileInput = {
  fullName?: string;
  bio?: string;
  whatsappNumber?: string;
  companyName?: string;
  websiteUrl?: string;
};

export function getProfile() {
  return apiRequest<CurrentUser>('/auth/me');
}

export function updateProfile(input: ProfileInput) {
  return apiRequest('/users/me', {
    method: 'PATCH',
    body: JSON.stringify({
      full_name: input.fullName,
      bio: input.bio,
      whatsapp_number: input.whatsappNumber,
      company_name: input.companyName,
      website_url: input.websiteUrl,
    }),
  });
}
