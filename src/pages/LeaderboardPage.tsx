import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, ArrowLeft, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { getActiveQuizSession, getLeaderboard } from '@/services/api';
import type { LeaderboardEntry, QuizSession } from '@/types/types';
import { cn } from '@/lib/utils';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevRanks, setPrevRanks] = useState<Map<string, number>>(new Map());
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());

  const loadLeaderboard = useCallback(async () => {
    const s = await getActiveQuizSession();
    setSession(s);
    if (s) {
      const lb = await getLeaderboard(s.id);
      setEntries(prev => {
        const oldRankMap = new Map(prev.map(e => [e.user_id, e.rank]));
        const changed = new Set<string>();
        lb.forEach(e => {
          const old = oldRankMap.get(e.user_id);
          if (old !== undefined && old !== e.rank) changed.add(e.user_id);
        });
        setPrevRanks(oldRankMap);
        setChangedIds(changed);
        setTimeout(() => setChangedIds(new Set()), 1200);
        return lb;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_answers' }, () => {
        loadLeaderboard();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadLeaderboard]);

  const myEntry = entries.find(e => e.user_id === user?.id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/quiz')} className="text-muted-foreground hover:text-foreground shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground text-balance">Leaderboard</h1>
          {session && <p className="text-sm text-muted-foreground truncate">{session.title}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={loadLeaderboard} className="text-muted-foreground hover:text-primary shrink-0">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* My score banner */}
      {myEntry && (
        <Card className="mb-6 border-primary/40 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center shrink-0">
              <span className="font-bold text-primary mono-num">#{myEntry.rank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {myEntry.name} {myEntry.surname} <span className="text-xs text-muted-foreground font-normal">(You)</span>
              </p>
              <p className="text-xs text-muted-foreground">{myEntry.tehsil}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-primary mono-num text-lg">{myEntry.total_points.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">pts</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 3 podium */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[entries[1], entries[0], entries[2]].map((entry, podiumIndex) => {
            if (!entry) return <div key={podiumIndex} />;
            const heights = ['h-20', 'h-28', 'h-16'];
            const realIndex = [1, 0, 2][podiumIndex];
            return (
              <div key={entry.user_id} className="flex flex-col items-center gap-1">
                <span className="text-xl">{MEDALS[realIndex]}</span>
                <div className={cn(
                  'w-full rounded flex flex-col items-center justify-end pb-2',
                  heights[podiumIndex],
                  realIndex === 0 ? 'bg-primary/20 border border-primary/40' : 'bg-secondary border border-border'
                )}>
                  <p className="text-xs font-semibold text-foreground text-center px-1 truncate w-full text-center">
                    {entry.name}
                  </p>
                  <p className="text-xs text-muted-foreground mono-num">
                    {entry.total_points.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <Card className="border-border bg-card">
        <CardHeader className="py-3 px-4 border-b border-border">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Trophy className="w-8 h-8 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No entries yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {entries.map((entry) => {
                const isMe = entry.user_id === user?.id;
                const rankMoved = changedIds.has(entry.user_id);
                const prevRank = prevRanks.get(entry.user_id);
                const movedUp = prevRank !== undefined && prevRank > entry.rank;

                return (
                  <div
                    key={entry.user_id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 transition-colors',
                      isMe && 'bg-primary/5',
                      rankMoved && movedUp && 'rank-up'
                    )}
                  >
                    <span className={cn(
                      'w-8 text-center mono-num text-sm font-bold shrink-0',
                      entry.rank <= 3 ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {entry.rank <= 3 ? MEDALS[entry.rank - 1] : `#${entry.rank}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', isMe ? 'text-primary' : 'text-foreground')}>
                        {entry.name} {entry.surname}
                        {isMe && <span className="ml-1 text-xs opacity-60">(You)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{entry.tehsil}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="mono-num">
                        {entry.total_points.toLocaleString()} pts
                      </Badge>
                      {movedUp && <Medal className="w-3.5 h-3.5 text-primary" />}
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
