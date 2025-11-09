import type { User } from './auth';
import type { PermissionsConfig } from '@crm-atlas/types';

/**
 * Map of API methods to their required scopes
 */
export const API_SCOPES: Record<string, string[]> = {
  // Auth APIs - no scopes required (public)
  'auth.login': [],
  'auth.getMe': [],

  // Config APIs - read only
  'config.getUnits': [],
  'config.getEntities': [],
  'config.getEntity': [],

  // Entities APIs
  'entities.list': ['crm:read'],
  'entities.getById': ['crm:read'],
  'entities.create': ['crm:write'],
  'entities.update': ['crm:write'],
  'entities.delete': ['crm:delete'],
  'entities.getRelated': ['crm:read'],

  // Search APIs
  'search.global': ['crm:read'],
  'search.text': ['crm:read'],
  'search.semantic': ['crm:read'],
  'search.hybrid': ['crm:read'],

  // Stats APIs
  'stats.getStats': ['crm:read'],
  'stats.getRecentNotes': ['crm:read'],

  // Indexing APIs
  'indexing.checkHealth': ['crm:read'],
  'indexing.getMetrics': ['crm:read'],
  'indexing.triggerBackfill': ['crm:write'],

  // MCP APIs
  'mcp.listTools': ['crm:read'],
  'mcp.callTool': ['crm:write', 'crm:read', 'crm:delete'], // Requires at least one
};

/**
 * Check if user has required scope
 */
export function hasScope(
  user: User,
  requiredScope: string,
  permissions?: PermissionsConfig | null
): boolean {
  // Check direct scopes
  if (user.scopes.includes(requiredScope)) {
    return true;
  }

  // Check role-based scopes if permissions config is provided
  if (permissions) {
    for (const role of user.roles) {
      const rolePerm = permissions.roles.find((r) => r.role === role);
      if (rolePerm && rolePerm.scopes.includes(requiredScope)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if user has at least one of the required scopes
 */
export function hasAnyScope(
  user: User,
  requiredScopes: string[],
  permissions?: PermissionsConfig | null
): boolean {
  if (requiredScopes.length === 0) {
    return true; // No scopes required
  }

  return requiredScopes.some((scope) => hasScope(user, scope, permissions));
}

/**
 * Check if an API method is available for the user
 */
export function isApiAvailable(
  apiMethod: string,
  user: User | null,
  permissions?: PermissionsConfig | null
): boolean {
  if (!user) {
    return false;
  }

  const requiredScopes = API_SCOPES[apiMethod];
  if (!requiredScopes) {
    // Unknown API method - allow by default (for backward compatibility)
    return true;
  }

  return hasAnyScope(user, requiredScopes, permissions);
}

/**
 * Get all available API methods for a user
 */
export function getAvailableApis(
  user: User | null,
  permissions?: PermissionsConfig | null
): string[] {
  if (!user) {
    return [];
  }

  return Object.keys(API_SCOPES).filter((apiMethod) =>
    isApiAvailable(apiMethod, user, permissions)
  );
}

/**
 * Filter API methods based on user permissions
 */
export function filterAvailableApis<T extends Record<string, unknown>>(
  apiMethods: T,
  user: User | null,
  permissions?: PermissionsConfig | null
): Partial<T> {
  if (!user) {
    return {} as Partial<T>;
  }

  const filtered: Partial<T> = {} as Partial<T>;

  for (const [key, value] of Object.entries(apiMethods)) {
    // Try to match API method name
    const apiMethod = Object.keys(API_SCOPES).find((method) => {
      const [, action] = method.split('.');
      return key.toLowerCase().includes(action?.toLowerCase() || '');
    });

    if (apiMethod && isApiAvailable(apiMethod, user, permissions)) {
      filtered[key as keyof T] = value;
    } else if (!apiMethod) {
      // Unknown API method - include by default
      filtered[key as keyof T] = value;
    }
  }

  return filtered;
}
