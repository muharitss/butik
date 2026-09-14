import { apiClient } from '../../../lib/apiClient.ts';

export interface UserDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'owner' | 'staff';
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserInput {
  name: string;
  email?: string;
  phone?: string;
  role: 'owner' | 'staff';
  temporaryPassword: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: 'owner' | 'staff';
}

export async function listUsers(): Promise<UserDto[]> {
  return apiClient.get<UserDto[]>('/users');
}

export async function createUser(input: CreateUserInput): Promise<UserDto> {
  return apiClient.post<UserDto>('/users', input);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<UserDto> {
  return apiClient.patch<UserDto>(`/users/${id}`, input);
}

export async function deactivateUser(id: string): Promise<UserDto> {
  return apiClient.patch<UserDto>(`/users/${id}/deactivate`);
}

export async function activateUser(id: string): Promise<UserDto> {
  return apiClient.patch<UserDto>(`/users/${id}/activate`);
}

export async function resetUserPassword(
  id: string,
  newPassword: string
): Promise<{ message: string }> {
  return apiClient.patch<{ message: string }>(`/users/${id}/password`, { newPassword });
}

export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  return apiClient.patch<{ message: string }>('/auth/password', {
    currentPassword,
    newPassword,
  });
}
