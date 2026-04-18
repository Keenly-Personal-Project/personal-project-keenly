-- Shared Keens table
CREATE TABLE public.keens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'BookOpen',
  image TEXT,
  color TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_keens_code ON public.keens(code);
CREATE INDEX idx_keens_slug ON public.keens(slug);

ALTER TABLE public.keens ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can look a keen up (needed for Join-by-code and listing your memberships)
CREATE POLICY "Authenticated users can view keens"
  ON public.keens FOR SELECT
  TO authenticated
  USING (true);

-- Any signed-in user can create a Keen (they become the owner)
CREATE POLICY "Users can create keens"
  ON public.keens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Owners and admins can edit
CREATE POLICY "Owners and admins can update keens"
  ON public.keens FOR UPDATE
  TO authenticated
  USING (public.has_keen_role(slug, auth.uid(), ARRAY['owner','admin']))
  WITH CHECK (public.has_keen_role(slug, auth.uid(), ARRAY['owner','admin']));

-- Only the original creator can delete (owner)
CREATE POLICY "Creator can delete keen"
  ON public.keens FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Auto-update updated_at
CREATE TRIGGER update_keens_updated_at
  BEFORE UPDATE ON public.keens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- When a Keen is created, automatically add the creator as Owner in keen_members
CREATE OR REPLACE FUNCTION public.add_keen_creator_as_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.keen_members (class_slug, user_id, email, role)
  VALUES (
    NEW.slug,
    NEW.created_by,
    COALESCE((SELECT email FROM auth.users WHERE id = NEW.created_by), ''),
    'owner'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_keen_created_add_owner
  AFTER INSERT ON public.keens
  FOR EACH ROW
  EXECUTE FUNCTION public.add_keen_creator_as_owner();