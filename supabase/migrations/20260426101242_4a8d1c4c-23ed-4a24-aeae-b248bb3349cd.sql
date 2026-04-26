
-- Announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_slug TEXT NOT NULL,
  user_id UUID NOT NULL,
  publisher_email TEXT NOT NULL DEFAULT '',
  publisher_avatar TEXT,
  brief TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  images JSONB,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (public.is_keen_member(class_slug, auth.uid()));

CREATE POLICY "Owners and admins can create announcements"
  ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

CREATE POLICY "Owners and admins can update announcements"
  ON public.announcements FOR UPDATE TO authenticated
  USING (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']))
  WITH CHECK (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

CREATE POLICY "Owners and admins can delete announcements"
  ON public.announcements FOR DELETE TO authenticated
  USING (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

CREATE TRIGGER set_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_slug TEXT NOT NULL,
  user_id UUID NOT NULL,
  publisher_email TEXT NOT NULL DEFAULT '',
  publisher_avatar TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  images JSONB,
  color TEXT,
  text_color TEXT,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view events"
  ON public.events FOR SELECT TO authenticated
  USING (public.is_keen_member(class_slug, auth.uid()));

CREATE POLICY "Owners and admins can create events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

CREATE POLICY "Owners and admins can update events"
  ON public.events FOR UPDATE TO authenticated
  USING (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']))
  WITH CHECK (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

CREATE POLICY "Owners and admins can delete events"
  ON public.events FOR DELETE TO authenticated
  USING (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_slug TEXT NOT NULL,
  user_id UUID NOT NULL,
  publisher_email TEXT NOT NULL DEFAULT '',
  publisher_avatar TEXT,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view notes"
  ON public.notes FOR SELECT TO authenticated
  USING (public.is_keen_member(class_slug, auth.uid()));

CREATE POLICY "Owners and admins can create notes"
  ON public.notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

CREATE POLICY "Owners and admins can update notes"
  ON public.notes FOR UPDATE TO authenticated
  USING (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']))
  WITH CHECK (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

CREATE POLICY "Owners and admins can delete notes"
  ON public.notes FOR DELETE TO authenticated
  USING (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

CREATE TRIGGER set_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_announcements_class_slug ON public.announcements(class_slug);
CREATE INDEX idx_events_class_slug ON public.events(class_slug);
CREATE INDEX idx_notes_class_slug ON public.notes(class_slug);

-- Enable realtime for the new tables and the existing recordings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_recordings;
