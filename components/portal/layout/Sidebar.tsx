import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  TrendingUp,
  Calendar,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/portal', icon: LayoutDashboard },
  { label: 'Clients', href: '/portal/clients', icon: Users },
  { label: 'Documents', href: '/portal/documents', icon: FileText },
  { label: 'Analytics', href: '/portal/analytics', icon: TrendingUp },
  { label: 'Calendar', href: '/portal/calendar', icon: Calendar },
  { label: 'Messages', href: '/portal/messages', icon: MessageSquare },
  { label: 'Settings', href: '/portal/settings', icon: Settings },
  { label: 'Help', href: '/portal/help', icon: HelpCircle },
];

interface SidebarProps {
  collapsed?: boolean;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, className }) => {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] border-r border-border bg-background transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      <nav className="h-full overflow-y-auto scrollbar-thin p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-button transition-all duration-200',
                    'hover:bg-muted',
                    isActive && 'bg-gold-100 text-gold-900 font-medium',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="text-body-md">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
