import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { configApi } from '@/lib/api/config';
import { API_SCOPES, isApiAvailable, hasScope } from '@/lib/api/permissions';
import { Loader2, CheckCircle2, XCircle, Code, Shield } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Group APIs by category
const API_CATEGORIES: Record<string, { name: string; apis: string[] }> = {
  auth: {
    name: 'Authentication',
    apis: ['auth.login', 'auth.getMe'],
  },
  config: {
    name: 'Configuration',
    apis: ['config.getUnits', 'config.getEntities', 'config.getEntity'],
  },
  entities: {
    name: 'Entities',
    apis: [
      'entities.list',
      'entities.getById',
      'entities.create',
      'entities.update',
      'entities.delete',
      'entities.getRelated',
    ],
  },
  search: {
    name: 'Search',
    apis: ['search.global', 'search.text', 'search.semantic', 'search.hybrid'],
  },
  stats: {
    name: 'Statistics',
    apis: ['stats.getStats', 'stats.getRecentNotes'],
  },
  indexing: {
    name: 'Indexing',
    apis: ['indexing.checkHealth', 'indexing.getMetrics', 'indexing.triggerBackfill'],
  },
  mcp: {
    name: 'MCP Tools',
    apis: ['mcp.listTools', 'mcp.callTool'],
  },
  workflows: {
    name: 'Workflows',
    apis: [
      'workflows.list',
      'workflows.get',
      'workflows.create',
      'workflows.update',
      'workflows.delete',
      'workflows.updateStatus',
      'workflows.trigger',
      'workflows.getExecutions',
      'workflows.getExecutionLog',
      'workflows.getTenantExecutions',
      'workflows.getStats',
    ],
  },
};

const SCOPE_COLORS: Record<string, string> = {
  'crm:read': 'bg-blue-100 text-blue-800',
  'crm:write': 'bg-green-100 text-green-800',
  'crm:delete': 'bg-red-100 text-red-800',
  'workflows:manage': 'bg-purple-100 text-purple-800',
  'workflows:execute': 'bg-orange-100 text-orange-800',
};

export default function APIMethodsTab() {
  const { tenantId, user } = useAuthStore();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['permissions', tenantId],
    queryFn: () => configApi.getPermissions(tenantId || ''),
    enabled: !!tenantId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading API methods...</span>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <p>Please log in to view available API methods</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const allApis = Object.keys(API_SCOPES);
  const availableApis = allApis.filter((api) => isApiAvailable(api, user, permissions || null));
  const unavailableApis = allApis.filter((api) => !isApiAvailable(api, user, permissions || null));

  // Get user scopes (direct + role-based)
  const userScopes = new Set<string>(user.scopes || []);
  if (permissions) {
    for (const role of user.roles || []) {
      const rolePerm = permissions.roles.find((r) => r.role === role);
      if (rolePerm) {
        rolePerm.scopes.forEach((scope) => userScopes.add(scope));
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            API Methods Overview
          </CardTitle>
          <CardDescription>
            Available API methods for user <strong>{user.email}</strong> with roles:{' '}
            <strong>{user.roles?.join(', ') || 'none'}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{allApis.length}</p>
                  <p className="text-sm text-gray-500">Total APIs</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{availableApis.length}</p>
                  <p className="text-sm text-gray-500">Available</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{unavailableApis.length}</p>
                  <p className="text-sm text-gray-500">Restricted</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Scopes */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-semibold mb-2">Your Scopes:</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(userScopes).length > 0 ? (
                Array.from(userScopes).map((scope) => (
                  <Badge key={scope} className={SCOPE_COLORS[scope] || 'bg-gray-100 text-gray-800'}>
                    {scope}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-500">No scopes assigned</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Methods by Category */}
      {Object.entries(API_CATEGORIES).map(([categoryKey, category]) => {
        const categoryApis = category.apis.filter((api) => API_SCOPES[api] !== undefined);
        if (categoryApis.length === 0) return null;

        const availableInCategory = categoryApis.filter((api) =>
          isApiAvailable(api, user, permissions || null)
        );

        return (
          <Card key={categoryKey}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription>
                    {availableInCategory.length} of {categoryApis.length} APIs available
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    availableInCategory.length === categoryApis.length ? 'default' : 'outline'
                  }
                  className={
                    availableInCategory.length === categoryApis.length
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : ''
                  }
                >
                  {availableInCategory.length}/{categoryApis.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">API Method</TableHead>
                      <TableHead>Required Scopes</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryApis.map((apiMethod) => {
                      const requiredScopes = API_SCOPES[apiMethod] || [];
                      const isAvailable = isApiAvailable(apiMethod, user, permissions || null);

                      return (
                        <TableRow key={apiMethod}>
                          <TableCell>
                            <code className="text-sm font-mono px-2 py-1 rounded bg-gray-50">
                              {apiMethod}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {requiredScopes.length > 0 ? (
                                requiredScopes.map((scope) => {
                                  const hasScopeForThis = hasScope(
                                    user,
                                    scope,
                                    permissions || null
                                  );
                                  return (
                                    <Badge
                                      key={scope}
                                      className={
                                        hasScopeForThis
                                          ? SCOPE_COLORS[scope] || 'bg-gray-100 text-gray-800'
                                          : 'bg-gray-100 text-gray-400 line-through'
                                      }
                                    >
                                      {scope}
                                    </Badge>
                                  );
                                })
                              ) : (
                                <span className="text-sm text-gray-400">No scopes required</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isAvailable ? (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-sm">Available</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-red-600">
                                <XCircle className="h-4 w-4" />
                                <span className="text-sm">Restricted</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
