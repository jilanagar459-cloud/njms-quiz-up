import { useEffect, useState, useCallback } from 'react';
import {
  Play, Square, ChevronRight, Plus, Trash2,
  Video, VideoOff, RefreshCw, PlusCircle, Image, FileText, Tv2,
  Upload, Link2, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  getAllQuizSessions, createQuizSession, updateQuizSession, deleteQuizSession,
  getQuestionsForSession, createQuestion, deleteQuestion, createOption
} from '@/services/api';
import type { QuizSession, Question, QuestionMediaType } from '@/types/types';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { cn, normalizeVideoUrl } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-secondary text-secondary-foreground',
  active: 'bg-primary text-primary-foreground',
  paused: 'bg-warning/20 text-warning',
  ended: 'bg-muted text-muted-foreground',
};

const MEDIA_ICONS: Record<QuestionMediaType, React.ReactNode> = {
  text: <FileText className="w-3.5 h-3.5" />,
  photo: <Image className="w-3.5 h-3.5" />,
  video: <Video className="w-3.5 h-3.5" />,
};

export default function AdminQuizControlPage() {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<QuizSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInputMode, setVideoInputMode] = useState<'link' | 'upload'>('link');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  // New question form
  const [newQ, setNewQ] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [correctIdx, setCorrectIdx] = useState(0);
  const [addQOpen, setAddQOpen] = useState(false);
  const [savingQ, setSavingQ] = useState(false);
  const [mediaType, setMediaType] = useState<QuestionMediaType>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaInputMode, setMediaInputMode] = useState<'link' | 'upload'>('link');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const loadSessions = useCallback(async () => {
    const all = await getAllQuizSessions();
    setSessions(all);
    setLoading(false);
  }, []);

  const loadQuestions = useCallback(async (sessionId: string) => {
    const qs = await getQuestionsForSession(sessionId);
    setQuestions(qs);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    if (selectedSession) {
      loadQuestions(selectedSession.id);
      setVideoUrl(normalizeVideoUrl(selectedSession.video_url ?? ''));
    }
  }, [selectedSession, loadQuestions]);

  const handleCreateSession = async () => {
    if (!newTitle.trim()) return;
    const s = await createQuizSession(newTitle.trim());
    if (s) {
      toast.success('Quiz session created');
      setNewSessionOpen(false);
      setNewTitle('');
      await loadSessions();
      setSelectedSession(s);
    }
  };

  const handleStart = async () => {
    if (!selectedSession) return;
    await updateQuizSession(selectedSession.id, {
      status: 'active', current_question_index: 0, started_at: new Date().toISOString(),
    });
    toast.success('Quiz started!');
    await loadSessions();
    setSelectedSession(prev => prev ? { ...prev, status: 'active', current_question_index: 0 } : prev);
  };

  const handlePause = async () => {
    if (!selectedSession) return;
    await updateQuizSession(selectedSession.id, { status: 'paused' });
    toast.success('Quiz paused');
    setSelectedSession(prev => prev ? { ...prev, status: 'paused' } : prev);
  };

  const handleResume = async () => {
    if (!selectedSession) return;
    await updateQuizSession(selectedSession.id, { status: 'active' });
    toast.success('Quiz resumed');
    setSelectedSession(prev => prev ? { ...prev, status: 'active' } : prev);
  };

  const handleStop = async () => {
    if (!selectedSession) return;
    await updateQuizSession(selectedSession.id, { status: 'ended', ended_at: new Date().toISOString() });
    toast.success('Quiz ended');
    setSelectedSession(prev => prev ? { ...prev, status: 'ended' } : prev);
    await loadSessions();
  };

  const handleNextQuestion = async () => {
    if (!selectedSession) return;
    const next = (selectedSession.current_question_index ?? 0) + 1;
    if (next >= questions.length) {
      toast.info('No more questions — ending quiz');
      await handleStop();
      return;
    }
    await updateQuizSession(selectedSession.id, { current_question_index: next });
    setSelectedSession(prev => prev ? { ...prev, current_question_index: next } : prev);
    toast.success(`Moved to question ${next + 1}`);
  };

  const handleToggleVideoAd = async () => {
    if (!selectedSession) return;
    const next = !selectedSession.show_video;
    await updateQuizSession(selectedSession.id, { show_video: next });
    setSelectedSession(prev => prev ? { ...prev, show_video: next } : prev);
    toast.success(next ? 'Video ad is now LIVE for all users' : 'Video ad hidden');
  };

  const handleSaveVideoUrl = async () => {
    if (!selectedSession) return;
    const normalized = normalizeVideoUrl(videoUrl);
    setVideoUrl(normalized);
    await updateQuizSession(selectedSession.id, { video_url: normalized || null });
    setSelectedSession(prev => prev ? { ...prev, video_url: normalized || null } : prev);
    toast.success('Video URL saved');
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSession) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { toast.error('Video must be under 100 MB'); return; }
    setUploadingVideo(true);
    const ext = file.name.split('.').pop();
    const path = `session-${selectedSession.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('videos').upload(path, file, { upsert: true });
    if (error) { toast.error('Upload failed: ' + error.message); setUploadingVideo(false); return; }
    const { data } = supabase.storage.from('videos').getPublicUrl(path);
    const publicUrl = data.publicUrl;
    setVideoUrl(publicUrl);
    await updateQuizSession(selectedSession.id, { video_url: publicUrl });
    setSelectedSession(prev => prev ? { ...prev, video_url: publicUrl } : prev);
    toast.success('Video uploaded and saved!');
    setUploadingVideo(false);
    e.target.value = '';
  };

  const handleDeleteQuestion = async (qId: string) => {
    await deleteQuestion(qId);
    setQuestions(prev => prev.filter(q => q.id !== qId));
    toast.success('Question removed');
  };

  const resetQForm = () => {
    setNewQ(''); setNewOptions(['', '', '', '']); setCorrectIdx(0);
    setMediaType('text'); setMediaUrl(''); setMediaInputMode('link');
  };

  const handleQuestionMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = mediaType === 'video';
    const maxBytes = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`${isVideo ? 'Video' : 'Image'} must be under ${isVideo ? '100 MB' : '10 MB'}`);
      return;
    }
    setUploadingMedia(true);
    const bucket = isVideo ? 'videos' : 'media';
    const ext = file.name.split('.').pop();
    const path = `question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { toast.error('Upload failed: ' + error.message); setUploadingMedia(false); return; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setMediaUrl(data.publicUrl);
    toast.success(`${isVideo ? 'Video' : 'Image'} uploaded`);
    setUploadingMedia(false);
    e.target.value = '';
  };

  const handleAddQuestion = async () => {
    if (!selectedSession || !newQ.trim()) return;
    if (newOptions.some(o => !o.trim())) { toast.error('Fill all 4 options'); return; }
    if (mediaType !== 'text' && !mediaUrl.trim()) { toast.error(`Enter a ${mediaType} URL`); return; }
    setSavingQ(true);
    const q = await createQuestion(
      selectedSession.id, newQ.trim(), questions.length,
      mediaType, mediaUrl.trim() || null,
    );
    if (q) {
      await Promise.all(newOptions.map((opt, i) => createOption(q.id, opt.trim(), i === correctIdx)));
      toast.success('Question added');
      await loadQuestions(selectedSession.id);
      resetQForm();
      setAddQOpen(false);
    }
    setSavingQ(false);
  };

  const handleDeleteSession = async () => {
    if (!deleteSessionId) return;
    await deleteQuizSession(deleteSessionId);
    toast.success('Session deleted');
    setDeleteSessionId(null);
    if (selectedSession?.id === deleteSessionId) setSelectedSession(null);
    await loadSessions();
  };

  const currentQ = selectedSession && (selectedSession.current_question_index ?? -1) >= 0
    ? questions[selectedSession.current_question_index]
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Quiz Control</h1>
          <p className="text-sm text-muted-foreground">Manage and run live quiz sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={loadSessions} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Dialog open={newSessionOpen} onOpenChange={setNewSessionOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 gap-2 font-semibold"><Plus className="w-4 h-4" /> New Session</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
              <DialogHeader><DialogTitle>Create Quiz Session</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-normal text-muted-foreground">Session Title</Label>
                  <Input
                    placeholder="e.g. General Knowledge Round 1"
                    className="bg-input border-border"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateSession()}
                    autoFocus
                  />
                </div>
                <Button className="w-full h-10 font-semibold" onClick={handleCreateSession}>Create Session</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Session list */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider px-1">Sessions</p>
          {sessions.length === 0 && (
            <Card className="border-border bg-card">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">No sessions yet.</CardContent>
            </Card>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => setSelectedSession(s)}
              className={cn(
                'flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors',
                selectedSession?.id === s.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:bg-secondary/30'
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
              </div>
              <Badge className={cn('text-xs shrink-0', STATUS_COLORS[s.status])}>{s.status}</Badge>
              <Button
                variant="ghost" size="icon"
                className="text-muted-foreground hover:text-destructive shrink-0 w-7 h-7"
                onClick={e => { e.stopPropagation(); setDeleteSessionId(s.id); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Control panel */}
        {selectedSession ? (
          <div className="lg:col-span-2 space-y-4">

            {/* ── VIDEO AD CONTROL ───────────────────────────────── */}
            <Card className={cn(
              'border-2 transition-colors',
              selectedSession.show_video ? 'border-primary bg-primary/5' : 'border-border bg-card'
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Tv2 className={cn('w-5 h-5', selectedSession.show_video ? 'text-primary' : 'text-muted-foreground')} />
                    <CardTitle className="text-base">Video Ad</CardTitle>
                    {selectedSession.show_video && (
                      <span className="text-xs font-semibold text-primary bg-primary/15 px-2 py-0.5 rounded-full animate-pulse">
                        LIVE
                      </span>
                    )}
                  </div>
                  <Button
                    className={cn(
                      'h-9 gap-2 font-semibold shrink-0',
                      selectedSession.show_video
                        ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    )}
                    onClick={handleToggleVideoAd}
                    disabled={!selectedSession.video_url}
                  >
                    {selectedSession.show_video
                      ? <><VideoOff className="w-4 h-4" /> Stop Ad</>
                      : <><Video className="w-4 h-4" /> Show Ad Now</>
                    }
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Toggle: Link vs Upload */}
                <div className="flex gap-1 p-1 bg-secondary rounded w-fit">
                  <button
                    type="button"
                    onClick={() => setVideoInputMode('link')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                      videoInputMode === 'link'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Link2 className="w-3.5 h-3.5" /> Paste Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoInputMode('upload')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                      videoInputMode === 'upload'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload File
                  </button>
                </div>

                {videoInputMode === 'link' ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="YouTube embed URL or direct video URL..."
                      className="flex-1 bg-input border-border text-sm h-9"
                      value={videoUrl}
                      onChange={e => setVideoUrl(e.target.value)}
                    />
                    <Button variant="secondary" size="sm" className="h-9 shrink-0" onClick={handleSaveVideoUrl}>
                      Save URL
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className={cn(
                      'flex flex-col items-center justify-center gap-2 w-full h-24 rounded border-2 border-dashed cursor-pointer transition-colors',
                      uploadingVideo
                        ? 'border-primary/40 bg-primary/5 cursor-not-allowed'
                        : 'border-border hover:border-primary/50 hover:bg-secondary/40'
                    )}>
                      {uploadingVideo ? (
                        <>
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                          <span className="text-xs text-muted-foreground">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Click to upload video (MP4, WebM — max 100 MB)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        className="sr-only"
                        disabled={uploadingVideo}
                        onChange={handleVideoFileUpload}
                      />
                    </label>
                    {selectedSession.video_url && (
                      <p className="text-xs text-primary truncate">Current: {selectedSession.video_url}</p>
                    )}
                  </div>
                )}

                {!selectedSession.video_url && (
                  <p className="text-xs text-muted-foreground">Save a video URL or upload a file to enable "Show Ad Now".</p>
                )}
                {selectedSession.show_video && (
                  <p className="text-xs text-primary font-medium">
                    ✓ Video ad is currently visible to all participants
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── QUIZ CONTROLS ──────────────────────────────────── */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{selectedSession.title}</CardTitle>
                  <Badge className={cn('text-xs', STATUS_COLORS[selectedSession.status])}>
                    {selectedSession.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current question preview */}
                {currentQ ? (
                  <div className="p-3 rounded border border-primary/30 bg-primary/5 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-primary uppercase tracking-wider">
                        Current Q ({(selectedSession.current_question_index ?? 0) + 1}/{questions.length})
                      </p>
                      <Badge variant="secondary" className="text-xs gap-1 py-0 h-5">
                        {MEDIA_ICONS[currentQ.media_type ?? 'text']}
                        <span className="capitalize">{currentQ.media_type ?? 'text'}</span>
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground">{currentQ.question_text}</p>
                  </div>
                ) : (
                  <div className="p-3 rounded border border-border bg-secondary/30 text-sm text-muted-foreground">
                    {questions.length === 0 ? 'No questions added yet' : 'Quiz not started'}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {selectedSession.status === 'waiting' && (
                    <Button className="h-9 gap-2 font-semibold" onClick={handleStart} disabled={questions.length === 0}>
                      <Play className="w-4 h-4" /> Start Quiz
                    </Button>
                  )}
                  {selectedSession.status === 'active' && (
                    <>
                      <Button variant="secondary" className="h-9 gap-2" onClick={handlePause}>Pause</Button>
                      <Button className="h-9 gap-2 font-semibold" onClick={handleNextQuestion}>
                        Next Question <ChevronRight className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {selectedSession.status === 'paused' && (
                    <Button className="h-9 gap-2 font-semibold" onClick={handleResume}>
                      <Play className="w-4 h-4" /> Resume
                    </Button>
                  )}
                  {(selectedSession.status === 'active' || selectedSession.status === 'paused') && (
                    <Button variant="destructive" size="sm" className="h-9 gap-2" onClick={handleStop}>
                      <Square className="w-3.5 h-3.5" /> End Quiz
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── QUESTIONS LIST ─────────────────────────────────── */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Questions ({questions.length})</CardTitle>
                <Dialog open={addQOpen} onOpenChange={v => { setAddQOpen(v); if (!v) resetQForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 gap-1.5 font-semibold">
                      <PlusCircle className="w-3.5 h-3.5" /> Add Question
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border max-h-[90dvh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">

                      {/* Media type selector */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-muted-foreground">Question Type</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['text', 'photo', 'video'] as QuestionMediaType[]).map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => { setMediaType(type); setMediaUrl(''); setMediaInputMode('link'); }}
                              className={cn(
                                'flex flex-col items-center gap-1.5 p-3 rounded border text-xs font-medium transition-colors',
                                mediaType === type
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border bg-input text-muted-foreground hover:border-primary/50'
                              )}
                            >
                              {type === 'text' && <FileText className="w-5 h-5" />}
                              {type === 'photo' && <Image className="w-5 h-5" />}
                              {type === 'video' && <Video className="w-5 h-5" />}
                              <span className="capitalize">{type}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Media for photo / video */}
                      {mediaType !== 'text' && (
                        <div className="space-y-1.5">
                          <Label className="text-sm font-normal text-muted-foreground">
                            {mediaType === 'photo' ? 'Question Image' : 'Question Video'}
                          </Label>

                          {/* Toggle: Link vs Upload */}
                          <div className="flex gap-1 p-1 bg-secondary rounded w-fit">
                            <button
                              type="button"
                              onClick={() => setMediaInputMode('link')}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                                mediaInputMode === 'link'
                                  ? 'bg-card text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              <Link2 className="w-3.5 h-3.5" /> Paste Link
                            </button>
                            <button
                              type="button"
                              onClick={() => setMediaInputMode('upload')}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                                mediaInputMode === 'upload'
                                  ? 'bg-card text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              <Upload className="w-3.5 h-3.5" /> Upload File
                            </button>
                          </div>

                          {mediaInputMode === 'link' ? (
                            <Input
                              placeholder={mediaType === 'photo'
                                ? 'https://example.com/image.jpg'
                                : 'https://www.youtube.com/embed/...'}
                              className="bg-input border-border"
                              value={mediaUrl}
                              onChange={e => setMediaUrl(e.target.value)}
                            />
                          ) : (
                            <label className={cn(
                              'flex flex-col items-center justify-center gap-2 w-full h-24 rounded border-2 border-dashed cursor-pointer transition-colors',
                              uploadingMedia
                                ? 'border-primary/40 bg-primary/5 cursor-not-allowed'
                                : 'border-border hover:border-primary/50 hover:bg-secondary/40'
                            )}>
                              {uploadingMedia ? (
                                <>
                                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                  <span className="text-xs text-muted-foreground">Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-5 h-5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground text-center px-2">
                                    {mediaType === 'photo'
                                      ? 'Click to upload image (JPG, PNG, WebP — max 10 MB)'
                                      : 'Click to upload video (MP4, WebM — max 100 MB)'}
                                  </span>
                                </>
                              )}
                              <input
                                type="file"
                                accept={mediaType === 'photo'
                                  ? 'image/jpeg,image/png,image/webp,image/gif'
                                  : 'video/mp4,video/webm,video/ogg,video/quicktime'}
                                className="sr-only"
                                disabled={uploadingMedia}
                                onChange={handleQuestionMediaUpload}
                              />
                            </label>
                          )}

                          {/* Live preview */}
                          {mediaType === 'photo' && mediaUrl && (
                            <div className="mt-1 aspect-video w-full overflow-hidden rounded border border-border bg-secondary">
                              <img src={mediaUrl} alt="preview" className="w-full h-full object-contain" />
                            </div>
                          )}
                          {mediaType === 'video' && mediaUrl && (
                            <div className="mt-1 aspect-video w-full overflow-hidden rounded border border-border">
                              {mediaInputMode === 'upload' ? (
                                <video src={mediaUrl} className="w-full h-full" controls />
                              ) : (
                                <iframe src={mediaUrl} className="w-full h-full" title="preview" allowFullScreen />
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Question text */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-muted-foreground">Question Text</Label>
                        <Input
                          placeholder="Enter your question..."
                          className="bg-input border-border"
                          value={newQ}
                          onChange={e => setNewQ(e.target.value)}
                          autoFocus
                        />
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        <Label className="text-sm font-normal text-muted-foreground">
                          Options — select the correct answer
                        </Label>
                        {newOptions.map((opt, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <button
                              type="button"
                              onClick={() => setCorrectIdx(i)}
                              className={cn(
                                'w-6 h-6 rounded-full border-2 shrink-0 transition-colors',
                                correctIdx === i ? 'border-primary bg-primary' : 'border-border'
                              )}
                            />
                            <Input
                              placeholder={`Option ${String.fromCharCode(65 + i)}`}
                              className="bg-input border-border flex-1"
                              value={opt}
                              onChange={e => {
                                const a = [...newOptions]; a[i] = e.target.value; setNewOptions(a);
                              }}
                            />
                          </div>
                        ))}
                      </div>

                      <Button className="w-full h-10 font-semibold" onClick={handleAddQuestion} disabled={savingQ}>
                        {savingQ ? 'Saving...' : 'Add Question'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent className="p-0">
                {questions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    No questions yet. Add questions to get started.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3',
                          idx === selectedSession.current_question_index && 'bg-primary/5'
                        )}
                      >
                        <span className="mono-num text-xs text-muted-foreground mt-0.5 w-5 shrink-0">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Badge variant="secondary" className="text-xs gap-1 py-0 h-5">
                              {MEDIA_ICONS[q.media_type ?? 'text']}
                              <span className="capitalize">{q.media_type ?? 'text'}</span>
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground text-balance">{q.question_text}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(q.options ?? []).map(opt => (
                              <span
                                key={opt.id}
                                className={cn(
                                  'text-xs px-2 py-0.5 rounded',
                                  opt.is_correct
                                    ? 'bg-[hsl(142_71%_45%/0.15)] text-[hsl(142_71%_65%)] border border-[hsl(142_71%_45%/0.3)]'
                                    : 'bg-secondary text-muted-foreground'
                                )}
                              >
                                {opt.option_text}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="text-muted-foreground hover:text-destructive shrink-0 w-7 h-7"
                          onClick={() => handleDeleteQuestion(q.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center rounded border border-dashed border-border min-h-48">
            <p className="text-muted-foreground text-sm">Select a session to manage</p>
          </div>
        )}
      </div>

      {/* Delete session confirm */}
      <AlertDialog open={!!deleteSessionId} onOpenChange={open => !open && setDeleteSessionId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the session, all questions, and all answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
