import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { statsApi, type Note, type EntityStats } from '@/lib/api/stats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Building2,
  Target,
  CheckSquare,
  FileText,
  Package,
  ShoppingCart,
  Wrench,
  File,
  type LucideIcon,
} from 'lucide-react';
import { format } from 'date-fns';

// Map entity names to icons
const entityIconMap: Record<string, LucideIcon> = {
  contact: Users,
  company: Building2,
  task: CheckSquare,
  opportunity: Target,
  note: FileText,
  product: Package,
  deal: ShoppingCart,
  service_order: Wrench,
  document: File,
};

// Default icon for unknown entities
const DefaultIcon = FileText;

function getEntityIcon(entityName: string): LucideIcon {
  return entityIconMap[entityName] || DefaultIcon;
}

export default function Dashboard() {
  const { tenantId, unitId } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', tenantId, unitId],
    queryFn: () => statsApi.getStats(tenantId || '', unitId || ''),
    enabled: !!tenantId && !!unitId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: recentNotes, isLoading: notesLoading } = useQuery({
    queryKey: ['recent-notes', tenantId, unitId],
    queryFn: () => statsApi.getRecentNotes(tenantId || '', unitId || '', 5),
    enabled: !!tenantId && !!unitId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Overview of your CRM data</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <div className="col-span-full text-center text-gray-500">Loading statistics...</div>
        ) : stats?.entities && stats.entities.length > 0 ? (
          stats.entities.map((entity: EntityStats) => {
            const Icon = getEntityIcon(entity.name);
            return (
              <Card key={entity.name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{entity.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{entity.total.toLocaleString()}</div>
                  <CardDescription>
                    {entity.name === 'task' && entity.pending !== undefined
                      ? `${entity.pending} pending`
                      : entity.name === 'opportunity' && entity.value !== undefined
                        ? `€${entity.value.toLocaleString()} total value`
                        : entity.recent !== undefined && entity.recent > 0
                          ? `${entity.recent} new this week`
                          : `Total ${entity.label.toLowerCase()}`}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center text-gray-500">No entities found</div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Notes</CardTitle>
            <CardDescription>Latest notes added to the system</CardDescription>
          </CardHeader>
          <CardContent>
            {notesLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : recentNotes && recentNotes.length > 0 ? (
              <div className="space-y-3">
                {recentNotes.map((note: Note) => (
                  <div key={note._id} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{note.title || 'Untitled Note'}</h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{note.content}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(note.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No notes yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Recent activity and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No notifications</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
