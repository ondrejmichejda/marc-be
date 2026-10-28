import { UserRole } from "./roles";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  picture?: string;
  googleId?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface GoogleProfile {
  id: string; // Google sub/id
  email: string;
  emailVerified: boolean;
  name: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  locale?: string;
}

export interface AuthSessionPayload {
  userId: string;
  email: string;
  name: string;
  role?: UserRole;
  picture?: string;
  iat: number;
  exp: number;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

export interface AuthResult {
  user: User;
  token: string;
  isNewUser: boolean;
}
