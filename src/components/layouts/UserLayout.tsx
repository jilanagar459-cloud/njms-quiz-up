import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate, NavLink } from 'react-router-dom';
import { User, Trophy, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const LOGO_URL = 'https://miaoda-conversation-file.s3cdn.medo.dev/user-cgx670wzewow/app-cgx697ufinsx/20260620/image0.jpeg';

export default function UserLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 h-14 max-w-5xl mx-auto w-full">
          {/* Brand */}
          <NavLink to="/quiz" className="flex items-center gap-2.5 min-w-0">
            <img src={LOGO_URL} alt="NJMS Logo" className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-primary/30" />
            <div className="hidden sm:block min-w-0">
              <p className="font-bold text-foreground text-sm leading-none tracking-tight">NJMS Quiz Up</p>
              <p className="text-[10px] text-muted-foreground leading-tight truncate">Nagpur Jila Maheshwari Sabha</p>
            </div>
            <span className="sm:hidden font-bold text-foreground text-sm">NJMS Quiz Up</span>
          </NavLink>

          {/* Nav + actions */}
          <div className="flex items-center gap-1">
            <NavLink
              to="/quiz"
              className={({ isActive }) => cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Quiz
            </NavLink>
            <NavLink
              to="/leaderboard"
              className={({ isActive }) => cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Leaderboard</span>
            </NavLink>
            {profile && (
              <NavLink
                to="/profile"
                className={({ isActive }) => cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{profile.name}</span>
              </NavLink>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
              onClick={handleSignOut}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
}
