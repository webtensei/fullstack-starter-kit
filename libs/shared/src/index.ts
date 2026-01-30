// Shared types and utilities between frontend and backend

// Auth types
export * from './auth';

/**
 * Shared domain types
 *
 * NOTE:
 * This starter uses username-based auth (not email-based) and supports multi-role RBAC.
 * Keep shared types aligned with backend API responses to avoid TS confusion/auto-import issues.
 */

export type Role = 'ADMIN' | 'USER';

// User type used by backend auth responses (register/me)
export interface User {
  id: string;
  username: string;
  roles: Role[];
  is_activated: boolean;
  is_blocked: boolean;
  name: string | null;
  surname: string | null;
  patronymic: string | null;
  phone: string | null;
  creation_date: string; // ISO string
  updated_at: string; // ISO string
}

/**
 * @deprecated Prefer `RegisterDto` from `@shared/auth` for auth flows.
 * Keep these only if you later add a separate Users module.
 */
export interface CreateUserDto {
  username: string;
  password: string;
}

export interface UpdateUserDto {
  name?: string | null;
  surname?: string | null;
  patronymic?: string | null;
  phone?: string | null;
  roles?: Role[];
  is_blocked?: boolean;
  is_activated?: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}

// Add more shared types here as needed
