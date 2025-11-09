import { apiClient } from './client';

export interface LoginRequest {
  tenant_id: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface User {
  _id: string;
  email: string;
  tenant_id: string;
  unit_id: string;
  roles: string[];
  scopes: string[];
  created_at: string;
  updated_at: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  getMe: async (token?: string): Promise<User> => {
    // Use provided token or rely on interceptor
    if (token) {
      // Temporarily set token in localStorage for interceptor to pick up
      const oldToken = localStorage.getItem('auth_token');
      localStorage.setItem('auth_token', token);
      try {
        const response = await apiClient.get<User>('/auth/me');
        return response.data;
      } finally {
        // Restore old token if it was different
        if (oldToken && oldToken !== token) {
          localStorage.setItem('auth_token', oldToken);
        }
      }
    }
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};
