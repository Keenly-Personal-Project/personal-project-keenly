CREATE OR REPLACE FUNCTION public.is_keen_member(_class_slug text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.keen_members km
    WHERE km.class_slug = _class_slug
      AND km.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_keen_role(_class_slug text, _user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.keen_members km
    WHERE km.class_slug = _class_slug
      AND km.user_id = _user_id
      AND km.role = ANY (_roles)
  );
$$;

DROP POLICY IF EXISTS "Members can view their own Keen members" ON public.keen_members;

CREATE POLICY "Users can view their own Keen membership"
ON public.keen_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins and owners can view Keen memberships"
ON public.keen_members
FOR SELECT
TO authenticated
USING (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

DROP POLICY IF EXISTS "Admins and owners can create assemblies" ON public.assemblies;
CREATE POLICY "Admins and owners can create assemblies"
ON public.assemblies
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin'])
);

DROP POLICY IF EXISTS "Admins and owners can delete assemblies" ON public.assemblies;
CREATE POLICY "Admins and owners can delete assemblies"
ON public.assemblies
FOR DELETE
TO authenticated
USING (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner','admin']));

DROP POLICY IF EXISTS "Keen members can view assemblies" ON public.assemblies;
CREATE POLICY "Keen members can view assemblies"
ON public.assemblies
FOR SELECT
TO authenticated
USING (public.is_keen_member(class_slug, auth.uid()));

DROP POLICY IF EXISTS "Users can view their own attendance" ON public.assembly_attendance;
CREATE POLICY "Users can view their own attendance"
ON public.assembly_attendance
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.assemblies a
    WHERE a.id = assembly_attendance.assembly_id
      AND public.has_keen_role(a.class_slug, auth.uid(), ARRAY['owner','admin'])
  )
);