
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Quiz session status
CREATE TYPE public.quiz_status AS ENUM ('waiting', 'active', 'paused', 'ended');

-- Profiles table (synced from auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text UNIQUE,
  email text UNIQUE,
  name text,
  surname text,
  tehsil text,
  role public.user_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-sync new users to profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    'user'::public.user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Helper function to get user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

-- Public profiles view
CREATE VIEW public_profiles AS
  SELECT id, name, surname, tehsil, role FROM profiles;

-- Quiz sessions
CREATE TABLE public.quiz_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL DEFAULT 'Live Quiz',
  status public.quiz_status NOT NULL DEFAULT 'waiting',
  current_question_index integer NOT NULL DEFAULT -1,
  video_url text,
  show_video boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

-- Questions
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_session_id uuid NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  time_limit integer NOT NULL DEFAULT 15,
  order_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Options
CREATE TABLE public.options (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false
);

-- User answers
CREATE TABLE public.user_answers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  quiz_session_id uuid NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.options(id),
  time_taken numeric NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);

-- Advertisements
CREATE TABLE public.advertisements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text,
  image_url text,
  link_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Leaderboard view (live aggregate)
CREATE OR REPLACE VIEW public.leaderboard AS
  SELECT
    ua.quiz_session_id,
    ua.user_id,
    p.name,
    p.surname,
    p.tehsil,
    p.phone,
    SUM(ua.points) AS total_points,
    COUNT(ua.id) AS questions_answered,
    RANK() OVER (PARTITION BY ua.quiz_session_id ORDER BY SUM(ua.points) DESC) AS rank
  FROM public.user_answers ua
  JOIN public.profiles p ON p.id = ua.user_id
  GROUP BY ua.quiz_session_id, ua.user_id, p.name, p.surname, p.tehsil, p.phone;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====

-- profiles
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own non-role fields" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

-- quiz_sessions: everyone can read, only admins write
CREATE POLICY "Anyone can view quiz sessions" ON quiz_sessions
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins manage quiz sessions" ON quiz_sessions
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- questions: everyone can read, only admins write
CREATE POLICY "Anyone can view questions" ON questions
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins manage questions" ON questions
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- options: everyone can read, only admins write
CREATE POLICY "Anyone can view options" ON options
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins manage options" ON options
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- user_answers
CREATE POLICY "Users can insert their own answers" ON user_answers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own answers" ON user_answers
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Admins can view all answers" ON user_answers
  FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- advertisements
CREATE POLICY "Anyone can view active ads" ON advertisements
  FOR SELECT TO authenticated, anon USING (is_active = true OR get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Admins manage advertisements" ON advertisements
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;

-- Seed some sample quiz data
INSERT INTO public.quiz_sessions (title, status) VALUES ('Sample Live Quiz', 'waiting');

-- Seed advertisements
INSERT INTO public.advertisements (title, content, display_order) VALUES
  ('Welcome to Live Quiz!', 'Test your knowledge and compete in real-time!', 1),
  ('Stay tuned for more quizzes', 'New quizzes every week. Register now!', 2);
