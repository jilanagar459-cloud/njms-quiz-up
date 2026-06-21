export type UserRole = 'user' | 'admin';
export type QuizStatus = 'waiting' | 'active' | 'paused' | 'ended';

export interface Profile {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  surname: string | null;
  tehsil: string | null;
  role: UserRole;
  created_at: string;
}

export interface QuizSession {
  id: string;
  title: string;
  status: QuizStatus;
  current_question_index: number;
  video_url: string | null;
  show_video: boolean;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export type QuestionMediaType = 'text' | 'photo' | 'video';

export interface Question {
  id: string;
  quiz_session_id: string;
  question_text: string;
  media_type: QuestionMediaType;
  media_url: string | null;
  time_limit: number;
  order_index: number;
  created_at: string;
  options?: Option[];
}

export interface Option {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

export interface UserAnswer {
  id: string;
  user_id: string;
  question_id: string;
  quiz_session_id: string;
  option_id: string | null;
  time_taken: number;
  points: number;
  is_correct: boolean;
  created_at: string;
}

export interface Advertisement {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Broadcast {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  sent_by: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  quiz_session_id: string;
  user_id: string;
  name: string | null;
  surname: string | null;
  tehsil: string | null;
  phone: string | null;
  total_points: number;
  questions_answered: number;
  rank: number;
}
