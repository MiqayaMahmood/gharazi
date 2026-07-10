import { apiRequest } from './client';

export type ProfessionalProfile = { id: string; businessName: string; businessType: string; contactPersonName: string; phone: string; whatsapp?: string; email?: string; websiteUrl?: string; logoUrl?: string; cityId?: string; addressLine?: string; description?: string; verificationStatus: string; rejectionReason?: string; city?: { id: string; name: string } };
export type ProfessionalProfileInput = Omit<ProfessionalProfile, 'id' | 'verificationStatus' | 'rejectionReason' | 'city'>;
export type ProfessionalSummary = {
  eligible: boolean; profile: ProfessionalProfile | null; verificationStatus: string; profileCompletion: number;
  subscription?: { status: string; packageCode?: string; currentPeriodEnd?: string; endAt?: string; plan?: { name: string; code: string } } | null;
  quota: { activeListingLimit: number; activeProjectLimit: number; activeListingsUsed: number; activeProjectsUsed: number; packageCode?: string; canCreateProject: boolean; enforcement: string };
  counts: Record<string, number>; metrics: Record<string, number>;
  recentLeads: Array<Record<string, any>>; recentChats: Array<Record<string, any>>; recentListings: Array<Record<string, any>>; recentProjects: Array<Record<string, any>>; promotedItems: Array<Record<string, any>>;
};

export const getProfessionalProfile = () => apiRequest<ProfessionalProfile | null>('/professional/profile/me');
export const createProfessionalProfile = (input: ProfessionalProfileInput) => apiRequest<ProfessionalProfile>('/professional/profile', { method: 'POST', body: JSON.stringify(input) });
export const updateProfessionalProfile = (input: Partial<ProfessionalProfileInput>) => apiRequest<ProfessionalProfile>('/professional/profile', { method: 'PATCH', body: JSON.stringify(input) });
export const requestProfessionalVerification = () => apiRequest('/professional/profile/request-verification', { method: 'POST' });
export const getProfessionalSummary = () => apiRequest<ProfessionalSummary>('/professional/dashboard/summary');
