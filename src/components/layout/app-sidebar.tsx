
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Boxes,
  Globe,
  Settings,
  LifeBuoy,
  FileText,
  DollarSign,
  Truck,
  Circle,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/types';

export default function AppSidebar() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/clients', label: 'Clients', icon: Users },
    { href: '/dashboard/stock', label: 'Stock', icon: Boxes },
    { href: '/dashboard/coconut-purchases', label: 'Coconut Buying', icon: Circle },
    { href: '/dashboard/exports', label: 'Exports', icon: Globe },
    { href: '/dashboard/local-sales', label: 'Local Sales', icon: Truck },
    { href: '/dashboard/finance', label: 'Finance', icon: DollarSign },
    { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  ];

  const bottomNavItems: NavItem[] = [
    { href: '#', label: 'Support', icon: LifeBuoy },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const renderNavItem = ({ href, label, icon: Icon }: NavItem) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return (
      <Link
        key={label}
        href={href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
          isActive && 'bg-muted text-primary'
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  };

  return (
    <div className="hidden border-r bg-card md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
             <Package className="h-6 w-6" />
             <span>SKTraders</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map(renderNavItem)}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <nav className="grid items-start gap-1 text-sm font-medium">
            {bottomNavItems.map(renderNavItem)}
          </nav>
        </div>
      </div>
    </div>
  );
}
