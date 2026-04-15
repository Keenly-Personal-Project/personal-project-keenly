-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own membership" ON public.keen_members;

-- Create new update policy that allows owners to update any member in their keen
CREATE POLICY "Users can update membership"
ON public.keen_members
FOR UPDATE
USING (
  (auth.uid() = user_id)
  OR has_keen_role(class_slug, auth.uid(), ARRAY['owner'::text])
)
WITH CHECK (
  (auth.uid() = user_id)
  OR has_keen_role(class_slug, auth.uid(), ARRAY['owner'::text])
);