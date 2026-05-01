-- Create note_folders table
CREATE TABLE public.note_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_slug TEXT NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'New Folder',
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view note folders"
ON public.note_folders FOR SELECT TO authenticated
USING (public.is_keen_member(class_slug, auth.uid()));

CREATE POLICY "Owners and admins can create note folders"
ON public.note_folders FOR INSERT TO authenticated
WITH CHECK ((auth.uid() = user_id) AND public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

CREATE POLICY "Owners and admins can update note folders"
ON public.note_folders FOR UPDATE TO authenticated
USING (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']))
WITH CHECK (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

CREATE POLICY "Owners and admins can delete note folders"
ON public.note_folders FOR DELETE TO authenticated
USING (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

CREATE TRIGGER update_note_folders_updated_at
BEFORE UPDATE ON public.note_folders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add folder_id to notes (nullable = unfoldered)
ALTER TABLE public.notes ADD COLUMN folder_id UUID REFERENCES public.note_folders(id) ON DELETE SET NULL;
CREATE INDEX idx_notes_folder_id ON public.notes(folder_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_folders;