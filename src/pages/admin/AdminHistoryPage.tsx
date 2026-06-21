import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Trophy, Users, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAllQuizSessions, getLeaderboard } from '@/services/api';
import type { QuizSession, LeaderboardEntry } from '@/types/types';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-secondary text-secondary-foreground',
  active: 'bg-primary text-primary-foreground',
  paused: 'bg-warning/20 text-warning',
  ended: 'bg-muted text-muted-foreground',
};

export default function AdminHistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [lbLoading, setLbLoading] = useState<string | null>(null);

  useEffect(() => {
    getAllQuizSessions().then(data => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  const handleExpand = async (sessionId: string) => {
    if (expanded === sessionId) { setExpanded(null); return; }
    setExpanded(sessionId);
    if (!leaderboards[sessionId]) {
      setLbLoading(sessionId);
      const lb = await getLeaderboard(sessionId);
      setLeaderboards(prev => ({ ...prev, [sessionId]: lb }));
      setLbLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Quiz History</h1>
        <p className="text-sm text-muted-foreground">Browse past and active quiz sessions</p>
      </div>

      {sessions.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <History className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No quiz sessions yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <Card key={session.id} className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base text-balance">{session.title}</CardTitle>
                      <Badge className={cn('text-xs', STATUS_COLORS[session.status])}>
                        {session.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="w-3 h-3" />
                        Created: {new Date(session.created_at).toLocaleString()}
                      </span>
                      {session.started_at && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Trophy className="w-3 h-3" />
                          Started: {new Date(session.started_at).toLocaleString()}
                        </span>
                      )}
                      {session.ended_at && (
                        <span className="text-xs text-muted-foreground">
                          Ended: {new Date(session.ended_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => handleExpand(session.id)}
                    >
                      <Users className="w-3.5 h-3.5" />
                      {expanded === session.id ? 'Hide' : 'View'} Results
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-primary hover:text-primary/80"
                      onClick={() => navigate(`/admin/leaderboard?session=${session.id}`)}
                    >
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expanded === session.id && (
                <CardContent className="border-t border-border pt-4 p-0">
                  {lbLoading === session.id ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (leaderboards[session.id]?.length ?? 0) === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-6">No participants</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max">
                        <thead>
                          <tr className="border-b border-border">
                            {['#', 'Name', 'Tehsil', 'Points'].map(h => (
                              <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {leaderboards[session.id].slice(0, 10).map(e => (
                            <tr key={e.user_id} className="hover:bg-secondary/20">
                              <td className="px-4 py-2.5 whitespace-nowrap text-sm mono-num font-bold text-primary">
                                #{e.rank}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-sm text-foreground">
                                {e.name} {e.surname}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-sm text-muted-foreground">
                                {e.tehsil ?? '—'}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-sm font-bold text-primary mono-num">
                                {e.total_points.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(leaderboards[session.id]?.length ?? 0) > 10 && (
                        <p className="text-center text-xs text-muted-foreground py-2">
                          +{(leaderboards[session.id]?.length ?? 0) - 10} more — export for full list
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
