
-- Add media type and URL to questions
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'text'
    CHECK (media_type IN ('text', 'photo', 'video')),
  ADD COLUMN IF NOT EXISTS media_url text DEFAULT NULL;

-- Update existing rows to text
UPDATE public.questions SET media_type = 'text' WHERE media_type IS NULL;
