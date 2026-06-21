import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const { signInAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Redirect if already admin
  if (profile?.role === 'admin') {
    navigate('/admin/quiz', { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setShake(true); setTimeout(() => setShake(false), 400); return; }
    setLoading(true);
    const { error } = await signInAdmin(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Invalid credentials');
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } else {
      toast.success('Welcome, Admin!');
      navigate('/admin/quiz');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="flex items-center gap-3 mb-8">
        <img src="https://miaoda-conversation-file.s3cdn.medo.dev/user-cgx670wzewow/app-cgx697ufinsx/20260620/image0.jpeg"
          alt="NJMS Logo" className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/40" />
        <div>
          <h1 className="text-xl font-bold text-foreground leading-none">NJMS Quiz Up</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Admin Portal</p>
        </div>
      </div>

      <Card className={`w-full max-w-sm border-border bg-card ${shake ? 'shake' : ''}`}>
        <CardHeader className="pb-4">
          <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center mb-2">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-xl text-balance">Admin Sign In</CardTitle>
          <CardDescription className="text-pretty">Access the quiz management dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-normal text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@quiz.com"
                  className="pl-9 bg-input border-border"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-normal text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 bg-input border-border"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
