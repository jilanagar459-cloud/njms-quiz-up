import { useState } from 'react';
import { User, Phone, MapPin, Pencil, Save, X, Award, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const LOGO_URL = 'https://miaoda-conversation-file.s3cdn.medo.dev/user-cgx670wzewow/app-cgx697ufinsx/20260620/image0.jpeg';

const NAGPUR_TEHSILS = [
  'Nagpur City','Nagpur Rural','Hingna','Kamptee','Katol',
  'Narkhed','Parseoni','Ramtek','Savner','Umred','Bhiwapur','Kuhi','Mouda',
];

export default function ProfilePage() {
  const { profile, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    surname: profile?.surname ?? '',
    tehsil: profile?.tehsil ?? '',
  });

  const startEdit = () => {
    setForm({ name: profile?.name ?? '', surname: profile?.surname ?? '', tehsil: profile?.tehsil ?? '' });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    if (!form.name.trim() || !form.surname.trim() || !form.tehsil) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);
    const { error } = await updateProfile({
      name: form.name.trim(),
      surname: form.surname.trim(),
      tehsil: form.tehsil,
    });
    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
      setEditing(false);
    }
    setSaving(false);
  };

  if (!profile) return null;

  const initials = `${profile.name?.[0] ?? ''}${profile.surname?.[0] ?? ''}`.toUpperCase() || 'U';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Hero Card */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/80 via-primary/60 to-primary/30 relative">
          <img src={LOGO_URL} alt="NJMS" className="absolute right-4 top-2 w-16 h-16 rounded-full object-cover opacity-30" />
        </div>
        <CardContent className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-8 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center ring-4 ring-card text-primary-foreground text-xl font-bold shrink-0">
              {initials}
            </div>
            {!editing ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={startEdit}>
                <Pencil className="w-3.5 h-3.5" /> Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground" onClick={cancelEdit} disabled={saving}>
                  <X className="w-3.5 h-3.5" /> Cancel
                </Button>
                <Button size="sm" className="h-8 gap-1.5 font-semibold" onClick={handleSave} disabled={saving}>
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>

          {!editing ? (
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground text-balance">
                {profile.name} {profile.surname}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Badge variant="secondary" className="gap-1.5">
                  <Phone className="w-3 h-3" />
                  <span className="mono-num">{profile.phone ?? '—'}</span>
                </Badge>
                {profile.tehsil && (
                  <Badge variant="outline" className="gap-1.5">
                    <MapPin className="w-3 h-3" />
                    {profile.tehsil}
                  </Badge>
                )}
                <Badge
                  className={cn(
                    'gap-1.5 capitalize',
                    profile.role === 'admin'
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                  variant="outline"
                >
                  <CheckCircle className="w-3 h-3" />
                  {profile.role}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-normal text-muted-foreground">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9 bg-input border-border" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="First name" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-normal text-muted-foreground">Surname</Label>
                  <Input className="bg-input border-border" value={form.surname}
                    onChange={e => setForm(f => ({ ...f, surname: e.target.value }))} placeholder="Surname" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal text-muted-foreground">Tehsil</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none" />
                  <Select value={form.tehsil} onValueChange={val => setForm(f => ({ ...f, tehsil: val }))}>
                    <SelectTrigger className="pl-9 bg-input border-border">
                      <SelectValue placeholder="Select tehsil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {NAGPUR_TEHSILS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Mobile number cannot be changed. Contact support if needed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Mobile Number', value: <span className="mono-num">{profile.phone ?? '—'}</span> },
            { label: 'Tehsil', value: profile.tehsil ?? '—' },
            { label: 'Role', value: <Badge variant="secondary" className="capitalize">{profile.role}</Badge> },
            { label: 'Member Since', value: new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
          ].map(({ label, value }, i, arr) => (
            <div key={label} className={cn('flex items-center justify-between py-2', i < arr.length - 1 && 'border-b border-border')}>
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium text-foreground">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-center gap-3 py-4">
        <img src={LOGO_URL} alt="NJMS" className="w-10 h-10 rounded-full object-cover opacity-80" />
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">NJMS Quiz Up</p>
          <p className="text-xs text-muted-foreground">Nagpur Jila Maheshwari Sabha</p>
        </div>
      </div>
    </div>
  );
}
