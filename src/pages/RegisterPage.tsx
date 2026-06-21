import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Mail, MapPin, ChevronRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

const LOGO_URL = 'https://miaoda-conversation-file.s3cdn.medo.dev/user-cgx670wzewow/app-cgx697ufinsx/20260620/image0.jpeg';

const NAGPUR_TEHSILS = [
  'Nagpur City','Nagpur Rural','Hingna','Kamptee','Katol',
  'Narkhed','Parseoni','Ramtek','Savner','Umred','Bhiwapur','Kuhi','Mouda',
];

export default function RegisterPage() {
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'register' | 'otp'>('register');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', surname: '', phone: '', email: '', tehsil: '' });
  const [otp, setOtp] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const normalizePhone = (p: string) => p.startsWith('+') ? p : '+' + p.replace(/\D/g, '');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { toast.error('Please accept the User Agreement & Privacy Policy'); return; }
    if (!form.name.trim() || !form.surname.trim() || !form.phone.trim() || !form.email.trim() || !form.tehsil.trim()) {
      toast.error('All fields are required'); triggerShake(); return;
    }
    setLoading(true);
    const { error } = await sendOtp(normalizePhone(form.phone), form.email.trim());
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Failed to send OTP');
      triggerShake();
    } else {
      toast.success('OTP sent to your email');
      setStep('otp');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) { toast.error('Enter your OTP'); triggerShake(); return; }
    const phoneWithCode = normalizePhone(form.phone);
    setLoading(true);
    const { error } = await verifyOtp(phoneWithCode, form.email.trim(), otp);
    if (error) {
      setLoading(false);
      toast.error(error.message || 'Invalid OTP');
      triggerShake();
      return;
    }
    // Update profile with registration details
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({
        name: form.name.trim(),
        surname: form.surname.trim(),
        tehsil: form.tehsil.trim(),
        phone: phoneWithCode,
      }).eq('id', user.id);
    }
    setLoading(false);
    toast.success('Welcome to LiveQuiz!');
    navigate('/quiz');
  };

  const handleResend = async () => {
    const { error } = await sendOtp(normalizePhone(form.phone), form.email.trim());
    if (error) toast.error(error.message);
    else toast.success('OTP resent');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <img src="https://miaoda-conversation-file.s3cdn.medo.dev/user-cgx670wzewow/app-cgx697ufinsx/20260620/image0.jpeg"
          alt="NJMS Logo" className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/40" />
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight leading-none">NJMS Quiz Up</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Nagpur Jila Maheshwari Sabha</p>
        </div>
      </div>

      {step === 'register' ? (
        <Card className={`w-full max-w-md border-border bg-card ${shake ? 'shake' : ''}`}>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-balance">Create Your Account</CardTitle>
            <CardDescription className="text-pretty">Register to join live quizzes and compete on the leaderboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-normal text-muted-foreground">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Ali"
                      className="pl-9 bg-input border-border"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="surname" className="text-sm font-normal text-muted-foreground">Surname</Label>
                  <Input
                    id="surname"
                    placeholder="Khan"
                    className="bg-input border-border"
                    value={form.surname}
                    onChange={e => setForm(f => ({ ...f, surname: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-normal text-muted-foreground">WhatsApp Number (with country code)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+923001234567"
                    className="pl-9 bg-input border-border mono-num"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-normal text-muted-foreground">Email (used to send your sign-in code)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9 bg-input border-border"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tehsil" className="text-sm font-normal text-muted-foreground">Tehsil</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none" />
                  <Select
                    value={form.tehsil}
                    onValueChange={val => setForm(f => ({ ...f, tehsil: val }))}
                  >
                    <SelectTrigger className="pl-9 bg-input border-border w-full">
                      <SelectValue placeholder="Select your tehsil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {NAGPUR_TEHSILS.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-1 accent-primary w-4 h-4 shrink-0"
                />
                <span className="text-xs text-muted-foreground text-pretty">
                  I agree to the{' '}
                  <span className="text-primary underline cursor-pointer">User Agreement</span>
                  {' '}and{' '}
                  <span className="text-primary underline cursor-pointer">Privacy Policy</span>
                </span>
              </label>

              <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                {loading ? 'Sending OTP...' : (
                  <span className="flex items-center gap-2">Send OTP <ChevronRight className="w-4 h-4" /></span>
                )}
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Already registered?{' '}
              <button onClick={() => navigate('/login')} className="text-primary hover:underline">
                Sign In
              </button>
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className={`w-full max-w-md border-border bg-card ${shake ? 'shake' : ''}`}>
          <CardHeader className="pb-4">
            <div className="w-10 h-10 bg-primary/20 rounded flex items-center justify-center mb-2">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-xl text-balance">Verify Your Email</CardTitle>
            <CardDescription className="text-pretty">
              Enter the OTP sent to <span className="text-foreground font-medium">{form.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="otp" className="text-sm font-normal text-muted-foreground">One-Time Password</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="Enter OTP"
                  className="text-center text-2xl tracking-widest mono-num h-14 bg-input border-border"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Join'}
              </Button>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <button type="button" onClick={() => setStep('register')} className="hover:text-foreground">
                  ← Change number
                </button>
                <button type="button" onClick={handleResend} disabled={loading} className="text-primary hover:underline">
                  Resend OTP
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
