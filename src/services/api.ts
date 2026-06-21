import { supabase } from '@/db/supabase';
import type { QuizSession, Question, Option, UserAnswer, Advertisement, LeaderboardEntry, Profile } from '@/types/types';

// ---- Quiz Sessions ----
export async function getActiveQuizSession(): Promise<QuizSession | null> {
  const { data } = await supabase
    .from('quiz_sessions')
    .select('*')
    .in('status', ['waiting', 'active', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getAllQuizSessions(): Promise<QuizSession[]> {
  const { data } = await supabase
    .from('quiz_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  return Array.isArray(data) ? data : [];
}

export async function createQuizSession(title: string): Promise<QuizSession | null> {
  const { data } = await supabase
    .from('quiz_sessions')
    .insert({ title })
    .select()
    .maybeSingle();
  return data;
}

export async function updateQuizSession(id: string, updates: Partial<QuizSession>): Promise<void> {
  await supabase.from('quiz_sessions').update(updates).eq('id', id);
}

export async function deleteQuizSession(id: string): Promise<void> {
  await supabase.from('quiz_sessions').delete().eq('id', id);
}

// ---- Questions ----
export async function getQuestionsForSession(sessionId: string): Promise<Question[]> {
  const { data } = await supabase
    .from('questions')
    .select('*, options(*)')
    .eq('quiz_session_id', sessionId)
    .order('order_index', { ascending: true })
    .limit(200);
  return Array.isArray(data) ? data : [];
}

export async function createQuestion(
  sessionId: string,
  questionText: string,
  orderIndex: number,
  mediaType: 'text' | 'photo' | 'video' = 'text',
  mediaUrl?: string | null,
): Promise<Question | null> {
  const { data } = await supabase
    .from('questions')
    .insert({
      quiz_session_id: sessionId,
      question_text: questionText,
      order_index: orderIndex,
      time_limit: 15,
      media_type: mediaType,
      media_url: mediaUrl ?? null,
    })
    .select()
    .maybeSingle();
  return data;
}

export async function deleteQuestion(id: string): Promise<void> {
  await supabase.from('questions').delete().eq('id', id);
}

// ---- Options ----
export async function createOption(questionId: string, optionText: string, isCorrect: boolean): Promise<Option | null> {
  const { data } = await supabase
    .from('options')
    .insert({ question_id: questionId, option_text: optionText, is_correct: isCorrect })
    .select()
    .maybeSingle();
  return data;
}

export async function deleteOption(id: string): Promise<void> {
  await supabase.from('options').delete().eq('id', id);
}

// ---- Answers ----
export async function submitAnswer(answer: {
  user_id: string;
  question_id: string;
  quiz_session_id: string;
  option_id: string;
  time_taken: number;
  points: number;
  is_correct: boolean;
}): Promise<void> {
  await supabase.from('user_answers').insert(answer);
}

export async function getUserAnswersForSession(userId: string, sessionId: string): Promise<UserAnswer[]> {
  const { data } = await supabase
    .from('user_answers')
    .select('*')
    .eq('user_id', userId)
    .eq('quiz_session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(200);
  return Array.isArray(data) ? data : [];
}

// ---- Leaderboard ----
export async function getLeaderboard(sessionId: string): Promise<LeaderboardEntry[]> {
  const { data } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('quiz_session_id', sessionId)
    .order('rank', { ascending: true })
    .limit(100);
  return Array.isArray(data) ? data : [];
}

// ---- Advertisements ----
export async function getActiveAds(): Promise<Advertisement[]> {
  const { data } = await supabase
    .from('advertisements')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .limit(50);
  return Array.isArray(data) ? data : [];
}

export async function getAllAds(): Promise<Advertisement[]> {
  const { data } = await supabase
    .from('advertisements')
    .select('*')
    .order('display_order', { ascending: true })
    .limit(50);
  return Array.isArray(data) ? data : [];
}

export async function createAd(ad: Omit<Advertisement, 'id' | 'created_at'>): Promise<void> {
  await supabase.from('advertisements').insert(ad);
}

export async function updateAd(id: string, updates: Partial<Advertisement>): Promise<void> {
  await supabase.from('advertisements').update(updates).eq('id', id);
}

export async function deleteAd(id: string): Promise<void> {
  await supabase.from('advertisements').delete().eq('id', id);
}

// ---- Users ----
export async function getAllUsers(page = 1, pageSize = 20): Promise<Profile[]> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);
  return Array.isArray(data) ? data : [];
}

export async function searchUsers(query: string): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .or(`name.ilike.%${query}%,surname.ilike.%${query}%,phone.ilike.%${query}%,tehsil.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(50);
  return Array.isArray(data) ? data : [];
}

// ---- Scoring ----
export function calculatePoints(timeTaken: number, timeLimit: number): number {
  if (timeTaken > timeLimit) return 0;
  // Max 1000 pts, minimum 100 pts for correct answer at last second
  const fraction = 1 - (timeTaken / timeLimit);
  return Math.max(100, Math.round(100 + fraction * 900));
}
