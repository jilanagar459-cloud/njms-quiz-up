import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Trophy, History,
  Megaphone, LogOut, Menu, X, ChevronRight, Download, Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const LOGO_URL = 'https://miaoda-conversation-file.s3cdn.medo.dev/user-cgx670wzewow/app-cgx697ufinsx/20260620/image0.jpeg';

const navItems = [
  { path: '/admin/quiz', label: 'Quiz Control', icon: LayoutDashboard },
  { path: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/history', label: 'Quiz History', icon: History },
  { path: '/admin/ads', label: 'Advertisements', icon: Megaphone },
  { path: '/admin/broadcast', label: 'Broadcast', icon: Radio },
  { path: '/admin/export', label: 'Export Results', icon: Download },
];

function NavItems({ onClose }: { onClose?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          onClick={onClose}
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span>{label}</span>
          <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-sidebar-border">
          <img src={LOGO_URL} alt="NJMS Logo" className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-primary/30" />
          <div className="min-w-0">
            <p className="font-bold text-sidebar-foreground text-sm leading-none">NJMS Quiz Up</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Admin Panel</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavItems />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">
                {profile?.name?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.name ?? 'Admin'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email ?? ''}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
                <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
                  <div className="flex items-center gap-2">
                    <img src={LOGO_URL} alt="NJMS Logo" className="w-7 h-7 rounded-full object-cover" />
                    <span className="font-bold text-sidebar-foreground text-sm">NJMS Admin</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="text-sidebar-foreground">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <NavItems onClose={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <img src={LOGO_URL} alt="NJMS Logo" className="w-6 h-6 rounded-full object-cover" />
              <span className="font-bold text-foreground text-sm">NJMS Quiz Up</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
