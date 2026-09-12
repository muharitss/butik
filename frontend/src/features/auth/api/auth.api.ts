import { apiClient } from '../../../lib/apiClient.ts';
import type { LoginInput, LogoutResponse, User } from '../types/auth.types.ts';

export const authApi = {
  login: async (credentials: LoginInput): Promise<User> => {
    return apiClient.post<User>('/auth/login', credentials, {
      skipAuthInterceptor: true,
    });
  },

  logout: async (): Promise<LogoutResponse> => {
    return apiClient.post<LogoutResponse>('/auth/logout');
  },

  getMe: async (): Promise<User> => {
    return apiClient.get<User>('/auth/me', {
      skipAuthInterceptor: true,
    });
  },
};
