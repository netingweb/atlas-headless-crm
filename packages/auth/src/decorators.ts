import { SetMetadata } from '@nestjs/common';
import type { Scope } from '@crm-atlas/types';

export const SCOPES_KEY = 'scopes';
export const AuthScopes = (...scopes: Scope[]) => SetMetadata(SCOPES_KEY, scopes);
