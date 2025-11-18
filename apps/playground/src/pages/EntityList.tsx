import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { entitiesApi } from '@/lib/api/entities';
import { configApi } from '@/lib/api/config';
import { isApiAvailable } from '@/lib/api/permissions';
import { Button } from '@/components/ui/button';
import { Plus, Copy, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function EntityList() {
  const { entityType } = useParams<{ entityType: string }>();
  const navigate = useNavigate();
  const { tenantId, unitId, user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
  const canUpdate = isApiAvailable('entities.update', user || null, permissions || null);
  const canDelete = isApiAvailable('entities.delete', user || null, permissions || null);

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast({
        title: 'Copied',
        description: 'Entity ID copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy entity ID to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (entity: NonNullable<typeof entities>[0]) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${entityType}?\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await entitiesApi.delete(tenantId || '', unitId || '', entityType || '', entity._id);
      queryClient.invalidateQueries({ queryKey: ['entities', tenantId, unitId, entityType] });
      toast({
        title: 'Success',
        description: 'Entity deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete entity',
        variant: 'destructive',
      });
    }
  };

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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-blue-600 hover:underline font-mono"
                        onClick={() => navigate(`/entities/${entityType}/${entity._id}`)}
                      >
                        {entity._id}
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-gray-100"
                        onClick={() => handleCopyId(entity._id)}
                        aria-label="Copy entity ID"
                      >
                        <Copy className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(entity as any).name || (entity as any).title || 'Untitled'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/entities/${entityType}/${entity._id}`)}
                          aria-label="Edit entity"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entity)}
                          aria-label="Delete entity"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
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
