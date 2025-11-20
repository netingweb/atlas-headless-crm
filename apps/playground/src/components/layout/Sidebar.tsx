import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery } from '@tanstack/react-query';
import { configApi } from '@/lib/api/config';
import { playgroundSettingsApi } from '@/lib/api/playground-settings';
import { useEntityVisibilityStore } from '@/stores/entity-visibility-store';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  CheckSquare,
  Target,
  Menu,
  Settings,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const entityIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  contact: Users,
  company: Building2,
  note: FileText,
  task: CheckSquare,
  opportunity: Target,
};

function toTitle(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { tenantId, unitId } = useAuthStore();
  const { isEntityVisibleInMenu, setEntityVisibility } = useEntityVisibilityStore();

  const { data: entityDefs, error: entitiesError } = useQuery({
    queryKey: ['config-entities', tenantId],
    queryFn: () => configApi.getEntities(tenantId || ''),
    enabled: !!tenantId,
    staleTime: 60_000,
    retry: 2,
  });

  // Load unit settings for visibility
  const { data: unitSettings } = useQuery({
    queryKey: ['unit-playground-settings', tenantId, unitId],
    queryFn: () => playgroundSettingsApi.getUnitSettings(tenantId || '', unitId || ''),
    enabled: !!tenantId && !!unitId,
    staleTime: 60_000,
  });

  // Update store when settings load
  React.useEffect(() => {
    if (unitSettings?.entityVisibility) {
      setEntityVisibility(unitSettings.entityVisibility);
    }
  }, [unitSettings, setEntityVisibility]);

  // Log error for debugging
  if (entitiesError) {
    console.error('Error loading entities for sidebar:', entitiesError);
  }

  const dynamicItems =
    (entityDefs || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((def) => isEntityVisibleInMenu(def.name)) // Filter by visibility
      .map((def) => {
        const Icon = entityIconMap[def.name] || FileText;
        return {
          icon: Icon,
          label: toTitle(def.name),
          path: `/entities/${def.name}`,
        };
      }) || [];

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    ...dynamicItems,
    { icon: Workflow, label: 'Workflows', path: '/workflows' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-white transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center border-b px-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        {!sidebarCollapsed && (
          <span className="ml-2 text-lg font-semibold">Atlas CRM Headless</span>
        )}
      </div>
      <nav className="p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <li key={item.path}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn('w-full justify-start', sidebarCollapsed && 'justify-center px-0')}
                  onClick={() => navigate(item.path)}
                >
                  <Icon className="h-5 w-5" />
                  {!sidebarCollapsed && <span className="ml-2">{item.label}</span>}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
