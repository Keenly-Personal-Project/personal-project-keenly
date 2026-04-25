-- Allow owners to remove any member (admin or member) from their Keen
-- Existing policy already allows users to delete their own membership.
CREATE POLICY "Owners can remove members"
  ON public.keen_members
  FOR DELETE
  TO authenticated
  USING (
    public.has_keen_role(class_slug, auth.uid(), ARRAY['owner']::text[])
    AND user_id <> auth.uid()  -- prevent owner deleting themselves via this policy (use transfer flow)
  );