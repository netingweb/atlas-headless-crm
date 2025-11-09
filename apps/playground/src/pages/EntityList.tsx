import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { entitiesApi } from '@/lib/api/entities';
import { configApi } from '@/lib/api/config';
import { isApiAvailable } from '@/lib/api/permissions';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function EntityList() {
  const { entityType } = useParams<{ entityType: string }>();
  const navigate = useNavigate();
  const { tenantId, unitId, user } = useAuthStore();

  const { data: entities, isLoading } = useQuery({
    queryKey: ['entities', tenantId, unitId, entityType],
    queryFn: () =>
      entitiesApi.list({
        tenant: tenantId || '',
        unit: unitId || '',
        entity: entityType || '',
      }),
    enabled: !!tenantId && !!unitId && !!entityType,
  });

  const { data: permissions } = useQuery({
    queryKey: ['permissions', tenantId],
    queryFn: () => configApi.getPermissions(tenantId || ''),
    enabled: !!tenantId,
  });

  const canCreate = isApiAvailable('entities.create', user || null, permissions || null);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold capitalize">{entityType}</h1>
          <p className="text-gray-500">Manage your {entityType} entities</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate(`/entities/${entityType}/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Create {entityType}
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entities && entities.length > 0 ? (
              entities.map((entity) => (
                <tr key={entity._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{entity._id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(entity as any).name || (entity as any).title || 'Untitled'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/entities/${entityType}/${entity._id}`)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                  No {entityType} found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
