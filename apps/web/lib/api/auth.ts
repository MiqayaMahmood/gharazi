import { apiRequest, clearStoredToken, getStoredToken, setStoredToken } from './client';
import { mockFallbackEnabled } from './mock-fallback';

export type CurrentUser = {
  id: string;
  phoneNumber: string;
  email?: string;
  roles: Array<string | { role?: { name?: string; code?: string }; name?: string; code?: string }>;
  status?: string;
  profile?: {
    fullName?: string;
    bio?: string;
    whatsappNumber?: string;
    companyName?: string;
    websiteUrl?: string;
  };
};

export type RegisterInput = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: string;
};

export async function requestOtp(phoneNumber: string) {
  try {
    return await apiRequest<{ ok?: boolean; message?: string }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  } catch (error) {
    if (!mockFallbackEnabled()) throw error;
    return { ok: true, message: 'OTP request queued in demo mode.' };
  }
}

export async function verifyOtp(phoneNumber: string, code: string) {
  try {
    const response = await apiRequest<{ accessToken: string; user: CurrentUser }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, otp: code }),
    });
    setStoredToken(response.accessToken);
    return response;
  } catch (error) {
    if (!mockFallbackEnabled()) throw error;
    const response = {
      accessToken: 'demo-token',
      user: { id: 'demo-user', phoneNumber, roles: ['buyer'] },
    };
    setStoredToken(response.accessToken);
    return response;
  }
}

export async function loginEmail(email: string, password: string) {
  const response = await apiRequest<{ accessToken: string; user: CurrentUser }>('/auth/login/email', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setStoredToken(response.accessToken);
  return response;
}

export async function register(input: RegisterInput) {
  const response = await apiRequest<{ accessToken: string; user: CurrentUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setStoredToken(response.accessToken);
  return response;
}

export async function forgotPassword(email: string) {
  return apiRequest<{ ok: boolean }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPassword(token: string, password: string) {
  return apiRequest<{ ok: boolean }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<{ ok: boolean }>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
}

export async function logout() {
  try {
    await apiRequest<{ ok: boolean }>('/auth/logout', { method: 'POST' });
  } finally {
    clearStoredToken();
  }
}

export async function getCurrentUser() {
  const token = getStoredToken();
  if (!token) return Promise.reject(new Error('No active session'));
  try {
    return await apiRequest<CurrentUser>('/auth/me');
  } catch (error) {
    clearStoredToken();
    throw error;
  }
}
