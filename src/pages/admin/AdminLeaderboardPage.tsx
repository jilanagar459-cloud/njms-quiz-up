import { useEffect, useState, useCallback } from 'react';
import { Trophy, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { getAllQuizSessions, getLeaderboard } from '@/services/api';
import type { QuizSession, LeaderboardEntry } from '@/types/types';
import { toast } from 'sonner';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function AdminLeaderboardPage() {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAllQuizSessions().then(ss => {
      setSessions(ss);
      if (ss.length > 0) setSelectedId(ss[0].id);
    });
  }, []);

  const loadLeaderboard = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    const lb = await getLeaderboard(selectedId);
    setEntries(lb);
    setLoading(false);
  }, [selectedId]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  const handleExport = () => {
    if (entries.length === 0) { toast.info('No data to export'); return; }
    const session = sessions.find(s => s.id === selectedId);
    const headers = ['Rank', 'Name', 'Surname', 'Phone', 'Tehsil', 'Total Points', 'Questions Answered'];
    const rows = entries.map(e => [
      e.rank, e.name ?? '', e.surname ?? '', e.phone ?? '', e.tehsil ?? '',
      e.total_points, e.questions_answered
    ]);
    const csv = [headers, ...rows].map(r => r.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaderboard-${session?.title ?? selectedId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Leaderboard exported');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">View and export quiz rankings</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-48 h-9 bg-input border-border text-sm">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {sessions.length === 0 && (
                <SelectItem value="none" disabled>No sessions</SelectItem>
              )}
              {sessions.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={loadLeaderboard}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" className="h-9 gap-2 font-semibold" onClick={handleExport} disabled={entries.length === 0}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No entries for this session</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {entries.length} Participants
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-border">
                    {['Rank', 'Name', 'Phone', 'Tehsil', 'Answered', 'Points'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map(e => (
                    <tr key={e.user_id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold mono-num text-sm">
                          {e.rank <= 3 ? MEDALS[e.rank - 1] : `#${e.rank}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm font-medium text-foreground">
                          {e.name} {e.surname}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground mono-num">
                        {e.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {e.tehsil ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="secondary" className="mono-num text-xs">{e.questions_answered}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-primary mono-num">{e.total_points.toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
