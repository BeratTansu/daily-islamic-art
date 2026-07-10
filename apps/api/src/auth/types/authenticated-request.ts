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

// OptionalJwtAuthGuard kullanan endpoint'ler için: user misafirde undefined.
// AuthenticatedRequest'i opsiyonel yapmak yerine ayrı tip —
// korumalı endpoint'lerde `req.user?.id` yazmak zorunda kalmayalım.
export interface OptionalAuthRequest extends Request {
  user?: AuthUser;
}