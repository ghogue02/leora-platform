import * as React from 'react';
import Link from 'next/link';
import { Menu, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick?: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, className }) => {
  return (
    <header
      className={cn(
        'sticky top-0 z-fixed w-full h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/portal" className="flex items-center gap-2">
            <span className="text-heading-md font-semibold">Leora</span>
          </Link>
        </div>

        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <Input
            type="search"
            placeholder="Search..."
            icon={<Search className="h-4 w-4" />}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>

          <div className="h-8 w-8 rounded-full bg-gold-500 flex items-center justify-center text-ink font-semibold text-sm">
            JD
          </div>
        </div>
      </div>
    </header>
  );
};
