import type { Request } from 'express';
import type { Role } from '@dia/database';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}