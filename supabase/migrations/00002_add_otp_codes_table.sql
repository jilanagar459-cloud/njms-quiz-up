
-- OTP codes table (codes are generated here and sent to the user via WhatsApp)
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX otp_codes_phone_idx ON public.otp_codes(phone);

-- RLS: only service role can access (via Edge Function)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- No policies = only service role (bypasses RLS) can access
