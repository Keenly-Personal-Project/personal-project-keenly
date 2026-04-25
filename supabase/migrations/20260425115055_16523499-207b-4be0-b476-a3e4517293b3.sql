-- Drop the over-permissive update policy that let members change their own role
DROP POLICY IF EXISTS "Users can update membership" ON public.keen_members;

-- Only owners can update membership rows (e.g., changing role).
CREATE POLICY "Owners can update memberships"
  ON public.keen_members
  FOR UPDATE
  TO authenticated
  USING (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner']::text[]))
  WITH CHECK (public.has_keen_role(class_slug, auth.uid(), ARRAY['owner']::text[]));