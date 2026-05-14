DROP POLICY IF EXISTS "Admins and owners can view Keen memberships" ON public.keen_members;
DROP POLICY IF EXISTS "Users can view their own Keen membership" ON public.keen_members;

CREATE POLICY "Members can view Keen memberships"
ON public.keen_members
FOR SELECT
TO authenticated
USING (public.is_keen_member(class_slug, auth.uid()));