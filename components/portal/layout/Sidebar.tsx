import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Package,
  ShoppingCart,
  TrendingUp,
  MessageCircle,
  User,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/orders', icon: FileText },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Cart', href: '/cart', icon: ShoppingCart },
  { label: 'Invoices', href: '/invoices', icon: CreditCard },
  { label: 'Insights', href: '/insights', icon: TrendingUp },
  { label: 'Ask Leora', href: '/leora', icon: MessageCircle },
  { label: 'Account', href: '/account', icon: User },
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
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

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
