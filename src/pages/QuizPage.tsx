import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Clock, Zap, CheckCircle, XCircle, Play, Video, Image, FileText, Medal, Info, AlertTriangle, CheckCircle2, Siren, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import {
  getActiveQuizSession,
  getQuestionsForSession,
  submitAnswer,
  getUserAnswersForSession,
  calculatePoints,
  getLeaderboard,
} from '@/services/api';
import type { QuizSession, Question, UserAnswer, LeaderboardEntry, Broadcast } from '@/types/types';
import { cn, normalizeVideoUrl, isDirectVideoFile } from '@/lib/utils';

type AnswerState = 'idle' | 'correct' | 'wrong' | 'timeout';

// ── Question media renderer ──────────────────────────────────────────────────
function QuestionMedia({ question }: { question: Question }) {
  if (question.media_type === 'photo' && question.media_url) {
    return (
      <div className="w-full rounded overflow-hidden border border-border bg-secondary">
        <img
          src={question.media_url}
          alt="Question image"
          className="w-full max-h-64 object-contain"
        />
      </div>
    );
  }
  if (question.media_type === 'video' && question.media_url) {
    if (isDirectVideoFile(question.media_url)) {
      return (
        <div className="w-full aspect-video rounded overflow-hidden border border-border bg-secondary">
          <video src={question.media_url} className="w-full h-full" controls />
        </div>
      );
    }
    return (
      <div className="w-full aspect-video rounded overflow-hidden border border-border">
        <iframe
          src={question.media_url}
          className="w-full h-full"
          allow="autoplay; fullscreen"
          allowFullScreen
          title="Question video"
        />
      </div>
    );
  }
  return null;
}

// ── Side ad rail (desktop only) ──────────────────────────────────────────────
type AdItem = { id: string; title: string; content: string | null; image_url: string | null; link_url: string | null };

function SideAdRail({ ads, adIndex, side }: { ads: AdItem[]; adIndex: number; side: 'left' | 'right' }) {
  if (ads.length === 0) return null;
  const ad = ads[adIndex % ads.length];
  if (!ad) return null;

  const content = (
    <Card className="border-border bg-card overflow-hidden h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ad</span>
      </div>
      {ad.image_url && (
        <div className="w-full aspect-[3/4] bg-secondary overflow-hidden shrink-0">
          <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className="p-3 flex-1">
        <p className="text-sm font-semibold text-foreground text-balance leading-snug">{ad.title}</p>
        {ad.content && (
          <p className="text-xs text-muted-foreground mt-1 text-pretty line-clamp-4">{ad.content}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div
      key={`${side}-${ad.id}`}
      className="hidden lg:block fixed top-1/2 -translate-y-1/2 w-48 z-20 fade-in"
      style={side === 'left' ? { left: '1rem' } : { right: '1rem' }}
    >
      {ad.link_url ? (
        <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
          {content}
        </a>
      ) : content}
    </div>
  );
}

// ── Media type badge ─────────────────────────────────────────────────────────
function MediaTypeBadge({ type }: { type: string }) {
  if (!type || type === 'text') return null;
  return (
    <Badge variant="secondary" className="gap-1 text-xs py-0 h-5">
      {type === 'photo' ? <Image className="w-3 h-3" /> : <Video className="w-3 h-3" />}
      <span className="capitalize">{type}</span>
    </Badge>
  );
}

export default function QuizPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<QuizSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [myAnswers, setMyAnswers] = useState<UserAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<{ id: string; title: string; content: string | null; image_url: string | null; link_url: string | null }[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [rightAdIndex, setRightAdIndex] = useState(1);
  const [miniLeaderboard, setMiniLeaderboard] = useState<LeaderboardEntry[]>([]);
  // questionKey increments every time admin advances — guarantees timer effect reruns
  const [questionKey, setQuestionKey] = useState(0);

  // Broadcast banner state
  const [activeBroadcast, setActiveBroadcast] = useState<Broadcast | null>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  const currentQuestion = session && (session.current_question_index ?? -1) >= 0
    ? questions[session.current_question_index] ?? null
    : null;

  const alreadyAnswered = currentQuestion
    ? myAnswers.some(a => a.question_id === currentQuestion.id)
    : false;

  const loadData = useCallback(async () => {
    if (!user) return;
    const s = await getActiveQuizSession();
    setSession(s);
    if (s) {
      const qs = await getQuestionsForSession(s.id);
      setQuestions(qs);
      const ans = await getUserAnswersForSession(user.id, s.id);
      setMyAnswers(ans);
      setTotalPoints(ans.reduce((sum, a) => sum + a.points, 0));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
    supabase
      .from('advertisements')
      .select('id,title,content,image_url,link_url')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(10)
      .then(({ data }) => {
        if (data) {
          setAds(data);
          setRightAdIndex(data.length > 1 ? 1 : 0);
        }
      });
  }, [loadData]);

  // Rotate ads
  useEffect(() => {
    if (ads.length < 2) return;
    const interval = setInterval(() => {
      setCurrentAdIndex(i => (i + 1) % ads.length);
      setRightAdIndex(i => (i + 1) % ads.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [ads.length]);

  // Realtime: quiz_sessions changes
  useEffect(() => {
    const channel = supabase
      .channel('quiz-session-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_sessions' }, async (payload) => {
        const updated = payload.new as QuizSession;
        // Load fresh questions for the updated session
        const freshQs = await getQuestionsForSession(updated.id);
        setQuestions(freshQs);
        // Now reset all per-question state atomically
        setSession(updated);
        setSelectedOption(null);
        setAnswerState('idle');
        setMiniLeaderboard([]);
        submittedRef.current = false;
        startTimeRef.current = Date.now();
        setTimeLeft(15);
        // Bump key to force timer effect to re-run even if question id is same
        setQuestionKey(k => k + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime: broadcasts — show banner when admin sends a message
  useEffect(() => {
    const channel = supabase
      .channel('broadcasts-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, (payload) => {
        const b = payload.new as Broadcast;
        setActiveBroadcast(b);
        // Auto-dismiss after 8 s (urgent stays 12 s)
        if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
        broadcastTimerRef.current = setTimeout(
          () => setActiveBroadcast(null),
          b.type === 'urgent' ? 12000 : 8000
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
    };
  }, []);

  // Timer — keyed to questionKey so it always restarts on question advance
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!session || session.status !== 'active' || alreadyAnswered) return;

    startTimeRef.current = Date.now();
    submittedRef.current = false;
    setTimeLeft(15);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (!submittedRef.current) {
            submittedRef.current = true;
            setAnswerState('timeout');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionKey, session?.status]);

  const handleSelectOption = async (optionId: string, isCorrect: boolean) => {
    if (!user || !currentQuestion || !session || alreadyAnswered || answerState !== 'idle' || submittedRef.current) return;
    submittedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const timeTaken = Math.min(elapsed, 15);
    const points = isCorrect ? calculatePoints(timeTaken, 15) : 0;

    setSelectedOption(optionId);
    setAnswerState(isCorrect ? 'correct' : 'wrong');

    await submitAnswer({
      user_id: user.id,
      question_id: currentQuestion.id,
      quiz_session_id: session.id,
      option_id: optionId,
      time_taken: timeTaken,
      points,
      is_correct: isCorrect,
    });

    const newAnswer: UserAnswer = {
      id: crypto.randomUUID(),
      user_id: user.id,
      question_id: currentQuestion.id,
      quiz_session_id: session.id,
      option_id: optionId,
      time_taken: timeTaken,
      points,
      is_correct: isCorrect,
      created_at: new Date().toISOString(),
    };
    if (isCorrect) setTotalPoints(p => p + points);
    setMyAnswers(prev => [...prev, newAnswer]);

    // Fetch mini-leaderboard immediately after submitting
    const lb = await getLeaderboard(session.id);
    setMiniLeaderboard(lb.slice(0, 5));
  };

  // ── Not signed in ─────────────────────────────────────────────────────────
  if (!user || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <div className="w-12 h-12 bg-primary rounded flex items-center justify-center">
          <Zap className="w-7 h-7 text-primary-foreground" />
        </div>
        <p className="text-foreground font-semibold text-lg">Please sign in to join the quiz</p>
        <Button onClick={() => navigate('/login')} className="h-11">Sign In</Button>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // ── No session / ended ────────────────────────────────────────────────────
  if (!session || session.status === 'ended') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
        <div className="w-16 h-16 bg-primary/10 rounded flex items-center justify-center">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground text-balance">
            {session?.status === 'ended' ? 'Quiz Ended!' : 'No Active Quiz'}
          </h2>
          <p className="text-muted-foreground mt-1 text-pretty">
            {session?.status === 'ended'
              ? `You scored ${totalPoints} points!`
              : 'Waiting for admin to start a quiz...'}
          </p>
        </div>
        {session?.status === 'ended' && (
          <Button onClick={() => navigate('/leaderboard')} className="h-11 px-8 font-semibold">
            <Trophy className="w-4 h-4 mr-2" /> View Leaderboard
          </Button>
        )}
        {ads.length > 0 && (
          <Card className="w-full max-w-md border-border bg-card mt-4">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Sponsored</p>
              <p className="font-semibold text-foreground">{ads[currentAdIndex]?.title}</p>
              {ads[currentAdIndex]?.content && (
                <p className="text-sm text-muted-foreground mt-1">{ads[currentAdIndex].content}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const timerPercent = (timeLeft / 15) * 100;
  const timerColor = timeLeft > 8 ? 'bg-primary' : timeLeft > 4 ? 'bg-warning' : 'bg-destructive';

  // Broadcast banner meta
  const BROADCAST_META = {
    info:    { icon: Info,           color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700' },
    warning: { icon: AlertTriangle,  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700' },
    success: { icon: CheckCircle2,   color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700' },
    urgent:  { icon: Siren,          color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700' },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16">
      {/* ── Side ad rails (desktop only, rotate independently) ── */}
      <SideAdRail ads={ads} adIndex={currentAdIndex} side="left" />
      <SideAdRail ads={ads} adIndex={rightAdIndex} side="right" />

      {/* ── Broadcast Banner ─────────────────────────────────────────────────── */}
      {activeBroadcast && (() => {
        const meta = BROADCAST_META[activeBroadcast.type] ?? BROADCAST_META.info;
        const Icon = meta.icon;
        return (
          <div className={cn(
            'sticky top-14 z-50 w-full border-b px-4 py-2.5 flex items-start gap-3 transition-all',
            meta.bg
          )}>
            <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', meta.color)} />
            <p className={cn('flex-1 text-sm font-medium', meta.color)}>{activeBroadcast.message}</p>
            <button
              className={cn('shrink-0 opacity-60 hover:opacity-100 transition-opacity', meta.color)}
              onClick={() => setActiveBroadcast(null)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-2">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground truncate max-w-[140px] md:max-w-xs">
              {session.title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="mono-num gap-1">
              <Trophy className="w-3 h-3" />
              {totalPoints.toLocaleString()}
            </Badge>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate('/leaderboard')}>
              <Trophy className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Timer bar */}
        <div className="mt-2 max-w-2xl mx-auto">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full timer-bar', timerColor)}
              style={{ width: `${session.status === 'active' ? timerPercent : 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-2xl mx-auto w-full gap-4">

        {/* ── VIDEO AD overlay (admin-controlled, shown any time) ── */}
        {session.show_video && session.video_url && (
          <div className="w-full space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-widest text-center">Sponsored</p>
            <div className="w-full aspect-video rounded overflow-hidden border border-primary/30">
              <iframe
                src={(() => {
                  const url = normalizeVideoUrl(session.video_url);
                  // Append autoplay + mute params for embed URLs
                  try {
                    const u = new URL(url);
                    if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/embed')) {
                      u.searchParams.set('autoplay', '1');
                      u.searchParams.set('mute', '0');
                      u.searchParams.set('rel', '0');
                      return u.toString();
                    }
                    if (u.hostname.includes('vimeo.com')) {
                      u.searchParams.set('autoplay', '1');
                      return u.toString();
                    }
                  } catch {}
                  return url;
                })()}
                className="w-full h-full"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                title="Video Ad"
              />
            </div>
          </div>
        )}

        {/* ── Waiting ─────────────────────────────────────────────── */}
        {session.status === 'waiting' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-12">
            <div className="w-16 h-16 bg-primary/10 rounded flex items-center justify-center">
              <Play className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Quiz Starting Soon</h2>
              <p className="text-muted-foreground mt-1">Admin is preparing the quiz...</p>
            </div>
            {ads.length > 0 && (
              <Card className="w-full border-border bg-card mt-4">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Sponsored</p>
                  <p className="font-semibold text-foreground">{ads[currentAdIndex]?.title}</p>
                  {ads[currentAdIndex]?.content && (
                    <p className="text-sm text-muted-foreground mt-1">{ads[currentAdIndex].content}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Paused ──────────────────────────────────────────────── */}
        {session.status === 'paused' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-12">
            <div className="w-16 h-16 bg-primary/10 rounded flex items-center justify-center">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Quiz Paused</h2>
            <p className="text-muted-foreground">Admin will resume shortly...</p>
          </div>
        )}

        {/* ── Active quiz ──────────────────────────────────────────── */}
        {session.status === 'active' && currentQuestion && (
          <div className="fade-in w-full space-y-4">
            {/* Q header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Question {(session.current_question_index ?? 0) + 1} / {questions.length}
                </span>
                <MediaTypeBadge type={currentQuestion.media_type ?? 'text'} />
              </div>
              <div className={cn(
                'flex items-center gap-1.5 mono-num text-sm font-bold px-3 py-1 rounded',
                timeLeft > 8 ? 'bg-primary/10 text-primary'
                  : timeLeft > 4 ? 'bg-warning/10 text-warning'
                  : 'bg-destructive/10 text-destructive'
              )}>
                <Clock className="w-3.5 h-3.5" />{timeLeft}s
              </div>
            </div>

            {/* Question media (photo or video) */}
            <QuestionMedia question={currentQuestion} />

            {/* Question text */}
            <Card className="border-border bg-card">
              <CardContent className="p-5">
                {(!currentQuestion.media_type || currentQuestion.media_type === 'text') && (
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Text Question</span>
                  </div>
                )}
                <p className="text-lg font-semibold text-foreground leading-relaxed text-balance">
                  {currentQuestion.question_text}
                </p>
              </CardContent>
            </Card>

            {/* Options */}
            <div className="grid gap-3">
              {(currentQuestion.options ?? []).map((opt, i) => {
                const isSelected = selectedOption === opt.id;
                const revealed = answerState !== 'idle' || alreadyAnswered;
                const existingAnswer = myAnswers.find(a => a.question_id === currentQuestion.id);
                const wasSelected = existingAnswer?.option_id === opt.id;

                let btnClass = 'w-full text-left px-4 py-3.5 rounded border transition-colors text-sm font-medium';
                if (revealed || alreadyAnswered) {
                  if (opt.is_correct)
                    btnClass += ' border-[hsl(142_71%_45%)] bg-[hsl(142_71%_45%/0.15)] text-[hsl(142_71%_65%)]';
                  else if (isSelected || wasSelected)
                    btnClass += ' border-destructive bg-destructive/15 text-destructive';
                  else
                    btnClass += ' border-border bg-secondary/30 text-muted-foreground';
                } else {
                  btnClass += ' border-border bg-secondary hover:border-primary hover:bg-primary/10 hover:text-primary text-foreground';
                }

                return (
                  <button
                    key={opt.id}
                    className={btnClass}
                    onClick={() => handleSelectOption(opt.id, opt.is_correct)}
                    disabled={revealed || alreadyAnswered}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded shrink-0 border border-current flex items-center justify-center text-xs font-bold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1 text-left">{opt.option_text}</span>
                      {(revealed || alreadyAnswered) && opt.is_correct && <CheckCircle className="w-4 h-4 shrink-0" />}
                      {(isSelected || wasSelected) && !opt.is_correct && (revealed || alreadyAnswered) && (
                        <XCircle className="w-4 h-4 shrink-0" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Answer feedback */}
            {(answerState !== 'idle' || alreadyAnswered) && (() => {
              const existingAnswer = myAnswers.find(a => a.question_id === currentQuestion.id);
              const wasCorrect = answerState === 'correct' || (alreadyAnswered && existingAnswer?.is_correct);
              return (
                <div className={cn(
                  'flex items-center gap-3 p-4 rounded border text-sm font-medium',
                  wasCorrect
                    ? 'border-[hsl(142_71%_45%/0.4)] bg-[hsl(142_71%_45%/0.1)] text-[hsl(142_71%_65%)]'
                    : answerState === 'timeout'
                    ? 'border-border bg-secondary/30 text-muted-foreground'
                    : 'border-destructive/40 bg-destructive/10 text-destructive'
                )}>
                  {wasCorrect
                    ? <><CheckCircle className="w-4 h-4 shrink-0" /> Correct! +{existingAnswer?.points ?? 0} pts</>
                    : answerState === 'timeout'
                    ? <><Clock className="w-4 h-4 shrink-0" /> Time's up! The correct answer is highlighted above.</>
                    : <><XCircle className="w-4 h-4 shrink-0" /> Wrong! The correct answer is highlighted above.</>
                  }
                </div>
              );
            })()}

            {/* ── Mini Leaderboard (shown after answering) ── */}
            {(answerState !== 'idle' || alreadyAnswered) && (
              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Live Rankings</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground h-7 px-2"
                      onClick={() => navigate('/leaderboard')}
                    >
                      View all →
                    </Button>
                  </div>

                  {miniLeaderboard.length === 0 ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {miniLeaderboard.map((entry, idx) => {
                        const isMe = entry.user_id === user?.id;
                        const medalColors = ['text-yellow-400', 'text-slate-400', 'text-amber-600'];
                        return (
                          <div
                            key={entry.user_id}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded text-sm',
                              isMe ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/40'
                            )}
                          >
                            {/* Rank */}
                            <span className={cn('w-5 shrink-0 text-center font-bold', medalColors[idx] ?? 'text-muted-foreground')}>
                              {idx < 3 ? <Medal className="w-4 h-4 inline" /> : idx + 1}
                            </span>
                            {/* Name */}
                            <span className={cn('flex-1 min-w-0 truncate font-medium', isMe ? 'text-primary' : 'text-foreground')}>
                              {entry.name
                                ? `${entry.name}${entry.surname ? ' ' + entry.surname : ''}`
                                : entry.phone ?? 'Player'}
                              {isMe && <span className="ml-1 text-xs text-primary/70">(you)</span>}
                            </span>
                            {/* Points */}
                            <span className="mono-num text-xs font-semibold text-foreground shrink-0">
                              {entry.total_points.toLocaleString()} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Waiting for admin to advance to next question...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Active but no question yet */}
        {session.status === 'active' && !currentQuestion && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-12">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Waiting for next question...</p>
          </div>
        )}
      </div>

      {/* ── PERMANENT AD BANNER (always visible at bottom) ── */}
      {ads.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0 border border-border rounded px-1.5 py-0.5">
              Ad
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">
                {ads[currentAdIndex]?.title}
              </p>
              {ads[currentAdIndex]?.content && (
                <p className="text-xs text-muted-foreground truncate leading-tight">
                  {ads[currentAdIndex].content}
                </p>
              )}
            </div>
            {ads.length > 1 && (
              <div className="flex gap-1 shrink-0">
                {ads.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentAdIndex(i)}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-colors',
                      i === currentAdIndex ? 'bg-primary' : 'bg-border'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
