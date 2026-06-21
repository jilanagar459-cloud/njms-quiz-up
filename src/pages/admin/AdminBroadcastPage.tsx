import { useEffect, useState } from 'react';
import {
  Megaphone, Send, Info, AlertTriangle, CheckCircle2, Siren, Clock, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Broadcast {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  created_at: string;
  profiles?: { name: string | null; surname: string | null } | null;
}

const TYPES = [
  { value: 'info',    label: 'Info',    icon: Info,           color: 'text-blue-500',  bg: 'bg-blue-500/10 border-blue-500/30' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle,  color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30' },
  { value: 'success', label: 'Success', icon: CheckCircle2,   color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/30' },
  { value: 'urgent',  label: 'Urgent',  icon: Siren,          color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' },
] as const;

export default function AdminBroadcastPage() {
  const { profile } = useAuth();
  const [message, setMessage] = useState('');
  const [type, setType] = useState<Broadcast['type']>('info');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('broadcasts')
      .select('id, message, type, created_at, profiles(name, surname)')
      .order('created_at', { ascending: false })
      .limit(50);
    setHistory(Array.isArray(data) ? data : []);
    setLoadingHistory(false);
  };

  useEffect(() => { loadHistory(); }, []);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) { toast.error('Message cannot be empty'); return; }
    setSending(true);
    const { error } = await supabase.from('broadcasts').insert({
      message: trimmed,
      type,
      sent_by: profile?.id ?? null,
    });
    if (error) {
      toast.error('Failed to send broadcast');
    } else {
      toast.success('Broadcast sent to all users!');
      setMessage('');
      loadHistory();
    }
    setSending(false);
  };

  const typeMeta = (t: Broadcast['type']) => TYPES.find(x => x.value === t) ?? TYPES[0];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Broadcast Messages</h1>
        <p className="text-sm text-muted-foreground">Send real-time alerts to all users currently on the quiz page</p>
      </div>

      {/* Compose */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            Compose Message
          </CardTitle>
          <CardDescription>Users will see the notification banner instantly after you send</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type selector */}
          <div className="space-y-1.5">
            <Label className="text-sm font-normal text-muted-foreground">Message Type</Label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(({ value, label, icon: Icon, color, bg }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm font-medium transition-colors',
                    type === value ? `${bg} ${color}` : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="text-sm font-normal text-muted-foreground">Message</Label>
            <Textarea
              className="bg-input border-border resize-none min-h-[80px]"
              placeholder="Type your broadcast message here..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/500</p>
          </div>

          {/* Preview */}
          {message.trim() && (
            <div className={cn('flex items-start gap-2.5 p-3 rounded border text-sm', typeMeta(type).bg)}>
              {(() => { const Icon = typeMeta(type).icon; return <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', typeMeta(type).color)} />; })()}
              <span className="text-foreground">{message}</span>
            </div>
          )}

          <Button
            className="w-full h-10 gap-2 font-semibold"
            onClick={handleSend}
            disabled={sending || !message.trim()}
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send Broadcast'}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="border-border bg-card">
        <CardHeader className="py-3 px-4 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Sent Messages ({history.length})
            </CardTitle>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={loadHistory}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center">
              <Megaphone className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No broadcasts sent yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.map(b => {
                const meta = typeMeta(b.type);
                const Icon = meta.icon;
                return (
                  <div key={b.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
                    <div className={cn('mt-0.5 p-1.5 rounded', meta.bg)}>
                      <Icon className={cn('w-3.5 h-3.5', meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground break-words">{b.message}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={cn('text-xs gap-1', meta.color, meta.bg)}>
                          {b.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(b.created_at).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
