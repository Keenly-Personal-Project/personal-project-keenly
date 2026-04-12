
-- Create keen_members table
CREATE TABLE public.keen_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_slug TEXT NOT NULL,
  user_id UUID NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.keen_members ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_keen_members_unique ON public.keen_members (class_slug, user_id);

CREATE POLICY "Members can view their own Keen members"
ON public.keen_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.keen_members km
    WHERE km.class_slug = keen_members.class_slug
    AND km.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add themselves to a Keen"
ON public.keen_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership"
ON public.keen_members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own membership"
ON public.keen_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create assemblies table
CREATE TABLE public.assemblies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_slug TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  late_time TIMESTAMP WITH TIME ZONE NOT NULL,
  absent_time TIMESTAMP WITH TIME ZONE NOT NULL,
  qr_token TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assemblies ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_assemblies_qr_token ON public.assemblies (qr_token);

CREATE POLICY "Keen members can view assemblies"
ON public.assemblies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.keen_members km
    WHERE km.class_slug = assemblies.class_slug
    AND km.user_id = auth.uid()
  )
);

CREATE POLICY "Admins and owners can create assemblies"
ON public.assemblies FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.keen_members km
    WHERE km.class_slug = assemblies.class_slug
    AND km.user_id = auth.uid()
    AND km.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins and owners can delete assemblies"
ON public.assemblies FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.keen_members km
    WHERE km.class_slug = assemblies.class_slug
    AND km.user_id = auth.uid()
    AND km.role IN ('owner', 'admin')
  )
);

-- Create assembly_attendance table
CREATE TABLE public.assembly_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  signed_in_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assembly_attendance ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_attendance_unique ON public.assembly_attendance (assembly_id, user_id);

CREATE POLICY "Users can view their own attendance"
ON public.assembly_attendance FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.assemblies a
    JOIN public.keen_members km ON km.class_slug = a.class_slug
    WHERE a.id = assembly_attendance.assembly_id
    AND km.user_id = auth.uid()
    AND km.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can sign in to assemblies"
ON public.assembly_attendance FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance"
ON public.assembly_attendance FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Also allow anonymous access for QR sign-in page (read assembly by token)
CREATE POLICY "Anyone can read assembly by qr_token for sign-in"
ON public.assemblies FOR SELECT
USING (true);
