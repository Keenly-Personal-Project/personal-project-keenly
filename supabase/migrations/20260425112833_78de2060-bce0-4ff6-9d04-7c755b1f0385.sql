-- Allow owners/admins to insert members (for approving join requests)
CREATE POLICY "Owners and admins can add members"
ON public.keen_members
FOR INSERT
TO authenticated
WITH CHECK (has_keen_role(class_slug, auth.uid(), ARRAY['owner'::text, 'admin'::text]));

-- Enable realtime for keen_members so approved users see updates instantly
ALTER TABLE public.keen_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.keen_members;