import { useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  CheckSquare,
  Target,
  Menu,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Contacts', path: '/entities/contact', entity: 'contact' },
  { icon: Building2, label: 'Companies', path: '/entities/company', entity: 'company' },
  { icon: FileText, label: 'Notes', path: '/entities/note', entity: 'note' },
  { icon: CheckSquare, label: 'Tasks', path: '/entities/task', entity: 'task' },
  { icon: Target, label: 'Opportunities', path: '/entities/opportunity', entity: 'opportunity' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

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
        {!sidebarCollapsed && <span className="ml-2 text-lg font-semibold">CRM Atlas</span>}
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
