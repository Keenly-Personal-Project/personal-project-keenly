-- Login verification codes table (separate from password reset codes)
CREATE TABLE public.login_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_login_codes_email ON public.login_codes(email);
CREATE INDEX idx_login_codes_expires ON public.login_codes(expires_at);

ALTER TABLE public.login_codes ENABLE ROW LEVEL SECURITY;

-- No client-side policies; only edge functions (service role) read/write this table.

-- Add username column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;