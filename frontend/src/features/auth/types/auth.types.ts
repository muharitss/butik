export interface User {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  isActive?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  id: string;
  name: string;
  role: string;
}

export interface LogoutResponse {
  loggedOut: boolean;
}
