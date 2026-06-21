import { useEffect, useState, useCallback } from 'react';
import { Download, RefreshCw, FileText, Users, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { getAllQuizSessions, getLeaderboard, getAllUsers } from '@/services/api';
import type { QuizSession, LeaderboardEntry, Profile } from '@/types/types';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map(r =>
    r.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminExportPage() {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loadingLb, setLoadingLb] = useState(false);
  const [exportingUsers, setExportingUsers] = useState(false);
  const [exportingAnswers, setExportingAnswers] = useState(false);

  useEffect(() => {
    getAllQuizSessions().then(ss => {
      setSessions(ss);
      if (ss.length > 0) setSelectedId(ss[0].id);
    });
  }, []);

  const loadLeaderboard = useCallback(async () => {
    if (!selectedId) return;
    setLoadingLb(true);
    const lb = await getLeaderboard(selectedId);
    setEntries(lb);
    setLoadingLb(false);
  }, [selectedId]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  // Export leaderboard/results for selected session
  const handleExportResults = () => {
    if (entries.length === 0) { toast.info('No results to export'); return; }
    const session = sessions.find(s => s.id === selectedId);
    const headers = ['Rank', 'Name', 'Surname', 'Phone', 'Tehsil', 'Total Points', 'Questions Answered'];
    const rows = entries.map(e => [
      e.rank, e.name ?? '', e.surname ?? '', e.phone ?? '', e.tehsil ?? '',
      e.total_points, e.questions_answered,
    ]);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV([headers, ...rows], `results-${session?.title ?? selectedId}-${date}.csv`);
    toast.success('Results exported successfully');
  };

  // Export all users
  const handleExportUsers = async () => {
    setExportingUsers(true);
    const users = await getAllUsers(1, 10000);
    if (users.length === 0) { toast.info('No users to export'); setExportingUsers(false); return; }
    const headers = ['Name', 'Surname', 'Phone', 'Email', 'Tehsil', 'Role', 'Joined'];
    const rows = users.map((u: Profile) => [
      u.name ?? '', u.surname ?? '', u.phone ?? '', u.email ?? '',
      u.tehsil ?? '', u.role, new Date(u.created_at).toLocaleDateString('en-IN'),
    ]);
    downloadCSV([headers, ...rows], `users-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Users exported successfully');
    setExportingUsers(false);
  };

  // Export individual answers for session
  const handleExportAnswers = async () => {
    if (!selectedId) return;
    setExportingAnswers(true);
    const { data, error } = await supabase
      .from('user_answers')
      .select(`
        id, time_taken, points, is_correct, created_at,
        profiles(name, surname, phone, tehsil),
        questions(question_text, order_index),
        options(option_text)
      `)
      .eq('quiz_session_id', selectedId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      toast.info('No answer data for this session');
      setExportingAnswers(false);
      return;
    }

    const headers = ['Name', 'Surname', 'Phone', 'Tehsil', 'Question #', 'Question', 'Answer', 'Correct', 'Points', 'Time (s)', 'Answered At'];
    const rows = data.map((row: any) => [
      row.profiles?.name ?? '',
      row.profiles?.surname ?? '',
      row.profiles?.phone ?? '',
      row.profiles?.tehsil ?? '',
      row.questions?.order_index ?? '',
      row.questions?.question_text ?? '',
      row.options?.option_text ?? '',
      row.is_correct ? 'Yes' : 'No',
      row.points,
      Number(row.time_taken).toFixed(2),
      new Date(row.created_at).toLocaleString('en-IN'),
    ]);

    const session = sessions.find(s => s.id === selectedId);
    downloadCSV([headers, ...rows], `answers-${session?.title ?? selectedId}-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Answers exported successfully');
    setExportingAnswers(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Export Results</h1>
        <p className="text-sm text-muted-foreground">Download quiz results, user data, and answer sheets as CSV</p>
      </div>

      {/* Session Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-64 h-9 bg-input border-border text-sm">
            <SelectValue placeholder="Select a quiz session..." />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {sessions.length === 0 && <SelectItem value="none" disabled>No sessions</SelectItem>}
            {sessions.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={loadLeaderboard}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        {selectedId && (
          <Badge variant="secondary" className="mono-num">
            {entries.length} participants
          </Badge>
        )}
      </div>

      {/* Export Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Results / Leaderboard */}
        <Card className="border-border bg-card h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center mb-2">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-base text-balance">Leaderboard Results</CardTitle>
            <CardDescription className="text-pretty">
              Final rankings with points, questions answered, and tehsil for the selected session.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end gap-3">
            {loadingLb ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{entries.length} entries ready to export</p>
            )}
            <Button
              className="w-full h-9 gap-2 font-semibold"
              onClick={handleExportResults}
              disabled={entries.length === 0 || loadingLb}
            >
              <Download className="w-4 h-4" /> Export Results CSV
            </Button>
          </CardContent>
        </Card>

        {/* Detailed Answers */}
        <Card className="border-border bg-card h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center mb-2">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-base text-balance">Answer Sheet</CardTitle>
            <CardDescription className="text-pretty">
              Detailed per-user, per-question answers with time taken and correctness for the selected session.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end gap-3">
            <p className="text-xs text-muted-foreground">Exports each answer submitted</p>
            <Button
              variant="secondary"
              className="w-full h-9 gap-2 font-semibold"
              onClick={handleExportAnswers}
              disabled={!selectedId || exportingAnswers}
            >
              <Download className="w-4 h-4" /> {exportingAnswers ? 'Exporting...' : 'Export Answer Sheet'}
            </Button>
          </CardContent>
        </Card>

        {/* All Users */}
        <Card className="border-border bg-card h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center mb-2">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-base text-balance">All Registered Users</CardTitle>
            <CardDescription className="text-pretty">
              Complete list of registered participants with name, phone, tehsil, and join date.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end gap-3">
            <p className="text-xs text-muted-foreground">Session-independent — exports all users</p>
            <Button
              variant="outline"
              className="w-full h-9 gap-2 font-semibold"
              onClick={handleExportUsers}
              disabled={exportingUsers}
            >
              <Download className="w-4 h-4" /> {exportingUsers ? 'Exporting...' : 'Export Users CSV'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview Table */}
      {entries.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Preview — Top 10
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-border">
                    {['Rank', 'Name', 'Phone', 'Tehsil', 'Questions', 'Points'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.slice(0, 10).map(e => (
                    <tr key={e.user_id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm font-bold mono-num">#{e.rank}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-foreground">{e.name} {e.surname}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-muted-foreground mono-num">{e.phone ?? '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-muted-foreground">{e.tehsil ?? '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <Badge variant="secondary" className="mono-num text-xs">{e.questions_answered}</Badge>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
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
