import { ApiResponse } from './api';

export type Role = 'admin' | 'publisher' | 'reader';

export type UserRole = 'publisher' | 'reader'

// Requests
export interface RegisterRequestBody {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface RefreshRequestBody {
  refreshToken?: string; // may come from cookie instead
}

// Responses
export interface RegisterResponseBody {
  id: string;
  email: string;
}

export interface LoginResponseBody {
  accessToken: string;
}

export interface RefreshResponseBody {
  accessToken: string;
}

export interface LogoutResponseBody {
  ok: boolean;
}

export interface MeResponseBody {
  id: string;
  first_name: string;
  last_name: string;
  role: Role;
  email: string;
  phone_number?: string | null;
  address?: string | null;
  avatar_image?: string | null;
  created_at: string; // ISO
  updated_at: string; // ISO
}

// Optional: wrapped versions
export type LoginApiResponse = ApiResponse<LoginResponseBody>;
export type RegisterApiResponse = ApiResponse<RegisterResponseBody>;
export type RefreshApiResponse = ApiResponse<RefreshResponseBody>;
export type LogoutApiResponse = ApiResponse<LogoutResponseBody>;
export type MeApiResponse = ApiResponse<MeResponseBody>;
