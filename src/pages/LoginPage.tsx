import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !email.trim()) { triggerShake(); return; }
    const phoneWithCode = phone.startsWith('+') ? phone : '+' + phone.replace(/\D/g, '');
    setLoading(true);
    const { error } = await sendOtp(phoneWithCode, email.trim());
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Failed to send OTP');
      triggerShake();
    } else {
      toast.success('OTP sent to your email');
      setStep('otp');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) { triggerShake(); return; }
    const phoneWithCode = phone.startsWith('+') ? phone : '+' + phone.replace(/\D/g, '');
    setLoading(true);
    const { error } = await verifyOtp(phoneWithCode, email.trim(), otp);
    setLoading(false);
    if (error) { toast.error(error.message || 'Invalid OTP'); triggerShake(); }
    else { toast.success('Welcome back!'); navigate('/quiz'); }
  };

  const handleResend = async () => {
    const phoneWithCode = phone.startsWith('+') ? phone : '+' + phone.replace(/\D/g, '');
    const { error } = await sendOtp(phoneWithCode, email.trim());
    if (error) toast.error(error.message);
    else toast.success('OTP resent');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="flex items-center gap-3 mb-8">
        <img src="https://miaoda-conversation-file.s3cdn.medo.dev/user-cgx670wzewow/app-cgx697ufinsx/20260620/image0.jpeg"
          alt="NJMS Logo" className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/40" />
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight leading-none">NJMS Quiz Up</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Nagpur Jila Maheshwari Sabha</p>
        </div>
      </div>

      <Card className={`w-full max-w-sm border-border bg-card ${shake ? 'shake' : ''}`}>
        <CardHeader className="pb-4">
          <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center mb-2">
            {step === 'phone' ? <Phone className="w-5 h-5 text-primary" /> : <Shield className="w-5 h-5 text-primary" />}
          </div>
          <CardTitle className="text-xl text-balance">
            {step === 'phone' ? 'Sign In' : 'Enter OTP'}
          </CardTitle>
          <CardDescription className="text-pretty">
            {step === 'phone'
              ? 'Enter your phone number and email to receive an OTP'
              : `Code sent to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-normal text-muted-foreground">
                  WhatsApp Number (with country code)
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+923001234567"
                    className="pl-9 bg-input border-border mono-num"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-normal text-muted-foreground">
                  Email (the one you registered with)
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9 bg-input border-border"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                New user?{' '}
                <button type="button" onClick={() => navigate('/register')} className="text-primary hover:underline">
                  Create account
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
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
                {loading ? 'Verifying...' : 'Sign In'}
              </Button>
              <div className="flex justify-between text-xs text-muted-foreground">
                <button type="button" onClick={() => setStep('phone')} className="hover:text-foreground">
                  ← Change number
                </button>
                <button type="button" onClick={handleResend} className="text-primary hover:underline">
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
