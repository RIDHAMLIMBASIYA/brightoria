import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user } = useAuth();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left Side */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Desktop search */}
            <div className="hidden md:flex items-center relative">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search courses, lessons..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9 w-64 lg:w-80 bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
            </Button>

            <div className="hidden md:flex items-center gap-3 pl-3 border-l border-border">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                alt={user?.name}
                className="w-9 h-9 rounded-full ring-2 ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Mobile search trigger (full-width) */}
        <div className="md:hidden pb-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-start gap-2"
            onClick={() => setMobileSearchOpen(true)}
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Search courses, lessons...</span>
          </Button>
        </div>
      </div>

      <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                type="search"
                placeholder="Type to search..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Search is UI-only for now (hook it up to Courses filtering when you’re ready).
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
