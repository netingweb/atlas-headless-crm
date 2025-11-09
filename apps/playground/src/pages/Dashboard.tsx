import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { statsApi, type Note } from '@/lib/api/stats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, Target, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';

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

  const kpis = [
    {
      label: 'Contacts',
      value: stats?.contacts.total ?? 0,
      recent: stats?.contacts.recent ?? 0,
      icon: Users,
    },
    {
      label: 'Companies',
      value: stats?.companies.total ?? 0,
      recent: stats?.companies.recent ?? 0,
      icon: Building2,
    },
    {
      label: 'Tasks',
      value: stats?.tasks.total ?? 0,
      pending: stats?.tasks.pending ?? 0,
      icon: CheckSquare,
    },
    {
      label: 'Opportunities',
      value: stats?.opportunities.total ?? 0,
      valueAmount: stats?.opportunities.value ?? 0,
      icon: Target,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Overview of your CRM data</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : kpi.value.toLocaleString()}
                </div>
                <CardDescription>
                  {kpi.label === 'Tasks' && kpi.pending !== undefined
                    ? `${kpi.pending} pending`
                    : kpi.label === 'Opportunities' && kpi.valueAmount !== undefined
                      ? `€${kpi.valueAmount.toLocaleString()} total value`
                      : kpi.recent !== undefined
                        ? `${kpi.recent} new this week`
                        : `Total ${kpi.label.toLowerCase()}`}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
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
